# FQL (Fast Query Language) Parser
Tool to convert searchstring (key:value ...) to SQL WHERE set of conditions


El proyecto se encuentra en desarrollo. Su objetivo es el de convertir a SQL (básico o knex) querys de tipo searchstring:

```
test1:asdf AND (columna:valor_a_buscar OR test:1,2,3)
```

## Sintáxis

- Búsqueda sencilla

`clave:valor`

- Negar búsqueda

`clave!:valor`

- Mayor que

`clave>:valor`

- Menor que

`clave<:valor`

- Rango de valores

`clave:[valor1 TO valor2]`

- Múltiples valores

`clave:valor1,valor2,valor3`

- Condiciones con espacios

`clave:"condición larga con espacios"`

- Búsqueda global incluyente

`+texto`
- Búsqueda global excluyente

`-texto`


## Opciones

El sistema dispone de las siguientes opciones:

- `aliases`: Objeto cuya clave es la tabla a la que aplica y su valor es un mapa de columnas->aliases
```json
{
    "table": {
        "*": "data->>'{{key}}'",
        "column1": "column1_modified::text",
        "column2": "column2::text",
    },
}

```
`*` -> Wildcard utilizado para aplicar el alias a todas las columnas de la tabla

`{{key}}` -> Reemplaza el alias con la clave utilizada en la consulta


- `allowGlobalSearch`: Permite la utilización de las búsquedas globales (+xxx -yyy) ya que no funcionan en todos los sistemas de Bases de datos. (Actualmente solo postgres)
- `caseInsensitive`: Permite la utilización de ILIKE en las búsquedas para hacer que las búsquedas sean _case insensitive_. (Actualmente solo postgres)
- `maxInputLength`: Longitud máxima permitida para la query de entrada. Default: `10000`
- `maxRegexIterations`: Límite de iteraciones del parser por regex para evitar casos patológicos. Default: `20000`
- `parseTimeoutMs`: Tiempo máximo de parseo en milisegundos antes de abortar. Default: `200`
- `maxDepth`: Profundidad máxima de anidamiento de paréntesis permitida. Default: `10`
- `maxParenthesesGroups`: Número máximo de grupos de paréntesis a procesar por parseo. Default: `100`
- `maxValueLength`: Longitud máxima permitida para valores parseados. Default: `4000`

### Sanitización de valores

- Se eliminan comillas dobles y `?` para mantener la semántica histórica del parser.
- `*` se convierte a `%` en búsquedas normales y a `:*` en búsquedas globales.
- En búsquedas globales (`+texto` / `-texto`) se eliminan operadores especiales de `tsquery` para evitar entradas conflictivas.
- Se eliminan caracteres de control y se aplica límite de longitud configurable (`maxValueLength`).

## Errores

El parser lanza errores explícitos cuando detecta entradas inválidas.

### Códigos de error

- `UNSUPPORTED_DIALECT`: El dialecto no soporta la funcionalidad solicitada (por ejemplo, búsqueda global fuera de PostgreSQL)
- `INVALID_QUERY`: La estructura de entrada no es válida para ser parseada
- `INVALID_IDENTIFIER`: El identificador de tabla no cumple el formato permitido
- `INVALID_LOGIC_OPERATOR`: El operador lógico no está en la whitelist (`AND`, `OR`)

### Errores de validación de constructor

- `FQLParser`: lanza `TypeError` si `options` no es objeto, si `aliases` no es objeto, si flags booleanas no son booleanas o si límites numéricos no son enteros positivos.
- `SQLParser`: lanza `TypeError` si `table` se informa con tipo inválido, si `dialect` no es string o si el `dialect` no está soportado.

## Operadores exportados

El paquete exporta constantes para evitar magic strings:

- `SQL_OPERATORS`: `LIKE`, `ILIKE`, `NOT LIKE`, `NOT ILIKE`, `>`, `<`, `BETWEEN`, `NOT BETWEEN`, `IN`, `NOT IN`
- `LOGICAL_OPERATORS`: `AND`, `OR`
- `QUERY_OPERATORS`: `:`, `!:`, `>:`, `<:`
- `SPECIAL_OPERATORS`: `plain_+`, `plain_-`


