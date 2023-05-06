import Schema from 'schemastery'
import { clone, deepEqual, valueMap } from 'cosmokit'
import { getCurrentInstance, ref, watch, WatchStopHandle } from 'vue'

export * from 'cosmokit'
export { Schema }

const dynamic = ['function', 'transform', 'is']

export function getChoices(schema: Schema) {
  const inner: Schema[] = []
  const choices = schema.list.filter((item) => {
    if (item.meta.hidden) return
    if (item.type === 'transform') inner.push(item.inner)
    return !dynamic.includes(item.type)
  })
  return choices.length ? choices : inner
}

export function getFallback(schema: Schema, required = false) {
  if (!schema || schema.type === 'union' && getChoices(schema).length === 1) return
  return clone(schema.meta.default) ?? (required ? inferFallback(schema) : undefined)
}

export function inferFallback(schema: Schema) {
  if (schema.type === 'string') return ''
  if (schema.type === 'number') return 0
  if (schema.type === 'boolean') return false
  if (['dict', 'object', 'intersect'].includes(schema.type)) return {}
}

function optional(schema: Schema): Schema {
  if (schema.type === 'const') return schema
  if (schema.type === 'object') {
    return Schema.object(valueMap(schema.dict, optional))
  } else if (schema.type === 'tuple') {
    return Schema.tuple(schema.list.map(optional))
  } else if (schema.type === 'intersect') {
    return Schema.intersect(schema.list.map(optional))
  } else if (schema.type === 'union') {
    return Schema.union(schema.list.map(optional))
  } else if (schema.type === 'dict') {
    return Schema.dict(optional(schema.inner))
  } else if (schema.type === 'array') {
    return Schema.array(optional(schema.inner))
  } else {
    return Schema(schema).required(false)
  }
}

export function check(schema: any, value: any) {
  try {
    optional(schema)(value)
    return true
  } catch {
    return false
  }
}

interface ConfigOptions<T> {
  strict?: boolean
  input(value: any): T
  output(value: T): any
}

export function useConfig<T = any>(options?: ConfigOptions<T>) {
  let stop: WatchStopHandle
  const config = ref<T>()
  const { props, emit } = getCurrentInstance() as any

  const doWatch = () => watch(config, (value) => {
    try {
      if (options) value = options.output(value)
    } catch {
      return
    }
    if (deepEqual(value, props.schema.meta.default, options?.strict)) value = null
    emit('update:modelValue', value)
  }, { deep: true })

  watch([() => props.modelValue, () => props.schema], ([value, schema]) => {
    stop?.()
    value ??= getFallback(schema)
    if (options) value = options.input(value)
    config.value = value
    stop = doWatch()
  }, { immediate: true })

  return config
}

export function useEntries() {
  const { props } = getCurrentInstance() as any

  const entries = useConfig<[string, any][]>({
    strict: true,
    input: (config) => Object.entries(config),
    output: (config) => {
      if (props.schema.type === 'array') {
        return config.map(([, value]) => value)
      }
      const result: any = {}
      for (const [key, value] of config) {
        if (key in result) throw new Error('duplicate entries')
        result[key] = value
      }
      return result
    },
  })

  return {
    entries,
    up(index: number) {
      if (props.schema.type === 'dict') {
        entries.value.splice(index - 1, 0, ...entries.value.splice(index, 1))
      } else {
        const temp = entries.value[index][1]
        entries.value[index][1] = entries.value[index - 1][1]
        entries.value[index - 1][1] = temp
      }
    },
    down(index: number) {
      if (props.schema.type === 'dict') {
        entries.value.splice(index + 1, 0, ...entries.value.splice(index, 1))
      } else {
        const temp = entries.value[index][1]
        entries.value[index][1] = entries.value[index + 1][1]
        entries.value[index + 1][1] = temp
      }
    },
    del(index: number) {
      entries.value.splice(index, 1)
    },
    add() {
      entries.value.push(['', null])
    },
  }
}
