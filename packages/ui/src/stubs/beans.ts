export const beansYaml = `
- beans:
  - name: myBean
    type: io.kaoto.MyBean
    properties:
      p1: p1v
      p2: p2v
  - name: myBean2
    type: io.kaoto.MyBean
    properties:
      p1:
        p1s1: p1s1v
`

export const beansJson = {
  "beans": [
    {
      "name": "myBean",
      "type": "io.kaoto.MyBean",
      "properties": {
        "p1": "p1v",
        "p2": "p2v"
      }
    },
    {
      "name": "myBean2",
      "type": "io.kaoto.MyBean",
      "properties": {
        "p1": {
          "p1s1": "p1s1v"
        }
      }
    }
  ]
}

