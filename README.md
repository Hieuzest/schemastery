# Schemastery

[![npm](https://img.shields.io/npm/v/schemastery?style=flat-square)](https://www.npmjs.com/package/schemastery)

Yet another schema validator.

## Advantages

- **Lightweight.** Zero dependencies.
- **Easy to use.** You can use any schema as a function or constructor directly.
- **Powerful.** Schemastery supports some advanced types such as `union`, `intersect` and `transform`.
- **Extensible.** You can create your own schema types via `Schema.extend()`.
- **Serializable.** Schema objects can be serialized into JSON and then be hydrated in another environment.

## Examples

### use as validator (JavaScript)

```js
const Schema = require('schemastery')

const validate = Schema.number().default(10)

validate(0)     // 0
validate(null)  // 10
validate('')    // TypeError
```

### use as constructor (TypeScript)

```ts
import Schema from 'schemastery'

interface Config {
  foo: Record<string, string>
  bar: string[]
}

const Config = Schema.object({
  foo: Schema.dict(Schema.string()).default({}),
  bar: Schema.array(Schema.string()).default([]),
})

// config is an instance of Config
// in this case, that is { foo: {}, bar: [] }
const config = new Config()
```

## Builtin Types

### Schema.any()

Assert that the value is of any type.

```js
const validate = Schema.any()

validate()          // undefined
validate(0)         // 0
validate({})        // {}
```

### Schema.never()

Assert that the value is nullable.

```js
const validate = Schema.never()

validate()          // undefined
validate(0)         // TypeError
validate({})        // TypeError
```

### Schema.const(value)

Assert that the value is equal to the given constant.

```js
const validate = Schema.const(10)

validate(10)        // 10
validate(0)         // TypeError
```

### Schema.number()

Assert that the value is a number.

```js
const validate = Schema.number()

validate()            // undefined
validate(1)           // 1
validate('')          // TypeError
```

### Schema.string()

Assert that the value is a string.

```js
const validate = Schema.string()

validate()            // undefined
validate(0)           // TypeError
validate('foo')       // 'foo'
```

### Schema.boolean()

Assert that the value is a boolean.

```js
const validate = Schema.boolean()

validate()            // undefined
validate(0)           // TypeError
validate(true)        // true
```

### Schema.array(value)

Assert that the value is an array of `subtype`. The default value will be `[]` if not specified.

```js
const validate = Schema.array(Schema.number())

validate()                  // []
validate(0)                 // TypeError
validate([0, 1])            // [0, 1]
validate([0, '1'])          // TypeError
```

### Schema.dict(value)

Assert that the value is a dictionary of `subtype`. The default value will be `{}` if not specified.

```js
const validate = Schema.dict(Schema.number())

validate()                  // {}
validate(0)                 // TypeError
validate({ a: 0, b: 1 })    // { a: 0, b: 1 }
validate({ a: 0, b: '1' })  // TypeError
```

### Schema.tuple(list)

Assert that the value is a tuple whose each element is of corresponding subtype. The default value will be `[]` if not specified.

```js
const validate = Schema.tuple([
  Schema.number(),
  Schema.string(),
])

validate()                  // []
validate([0])               // { a: 0 }
validate([0, 1])            // TypeError
validate([0, '1'])          // [0, '1']
```

### Schema.object(dict)

Assert that the value is an object whose each property is of corresponding subtype. The default value will be `{}` if not specified.

```js
const validate = Schema.dict({
  a: Schema.number(),
  b: Schema.string(),
})

validate()                  // {}
validate({ a: 0 })          // { a: 0 }
validate({ a: 0, b: 1 })    // TypeError
validate({ a: 0, b: '1' })  // { a: 0, b: '1' }
```

### Schema.union(list)

Assert that the value is one of the specified types.

```js
const validate = Schema.union([
  Schema.number(),
  Schema.string(),
])

validate()                  // undefined
validate(0)                 // 0
validate('1')               // '1'
validate(true)              // TypeError
```

### Schema.intersect(list)

Assert that the value should match each specified type.

```js
const validate = Schema.intersect([
  Schema.object({ a: Schema.string().required() }),
  Schema.object({ b: Schema.number().default(0) }),
])

validate()                  // TypeError
validate({ a: '' })         // { a: '', b: 0 }
validate({ a: '', b: 1 })   // { a: '', b: 1 }
validate({ a: '', b: '2' }) // TypeError
```

### Schema.transform(value, callback)

Assert that the value is of the specified subtype and then transformed by `callback`.

```js
const validate = Schema.transform(Schema.number().default(0), n => n + 1)

validaate()                 // 1
validate('0')               // TypeError
validate(10)                // 11
```

## Shorthand Syntax

Some shorthand syntax is available for inner types.

- `Schema.any()` -> `undefined`
- `Schema.string()` -> `String`
- `Schema.number()` -> `Number`
- `Schema.boolean()` -> `Boolean`
- `Schema.const(1)` -> `1` (only for primitive types)
- `Schema.is(Date)` -> `Date`

```js
Schema.array(String) // Schema.array(Schema.string())
Schema.union([1, 2]) // Schema.union([Schema.const(1), Schema.const(2)])
Schema.dict(RegExp) // Schema.dict(Schema.is(RegExp))
```

## Advanced Examples

Here are some examples which demonstrate how to define advanced types.

### Enumeration

```js
const Enum = Schema.union(['red', 'blue'])

Enum('red')                 // 'red'
Enum('blue')                // 'blue'
Enum('green')               // TypeError
```

### ToString

```js
const ToString = Schema.transform(Schema.any(), v => String(v))

ToString('')                // ''
ToString(0)                 // '0'
ToString({})                // '{}'
```

### Listable

```js
const Listable = Schema.union([
  Schema.array(Schema.number()),
  Schema.transform(Schema.number(), n => [n]),
]).default([])

Listable()                  // []
Listable(0)                 // [0]
Listable([1, 2])            // [1, 2]
```

### Alias

```js
const Config = Schema.dict(Schema.number(), Schema.union([
  'foo',
  Schema.transform('bar', () => 'foo'),
]))

Config({ foo: 1 })          // { foo: 1 }
Config({ bar: 2 })          // { foo: 2 }
Config({ bar: '3' })        // TypeError
```

## Extensibility

## Serializability

```js
const schema1 = Schema.object({
  foo: Schema.string(),
  bar: Schema.number(),
})

// should have the same effect as schema1
const schema2 = new Schema(JSON.parse(JSON.stringify(schema1)))
```
