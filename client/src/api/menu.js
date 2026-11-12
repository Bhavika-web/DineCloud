import http from './http'

let menuRequest

const getMenuItems = () => {
  if (!menuRequest) {
    menuRequest = http.get('/menu')
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new Error('The menu service returned an unexpected response.')
        }

        return data
          .filter((item) => item?.available === true)
          .map((item) => {
            if (typeof item._id !== 'string' || !item._id) {
              throw new Error('A menu item is missing its database ID.')
            }
            return { ...item, id: item._id }
          })
      })
      .catch((error) => {
        menuRequest = undefined
        throw error
      })
  }

  return menuRequest
}

export default getMenuItems
