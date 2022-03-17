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


