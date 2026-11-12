import http from './http'

let menuRequest
let menuRefreshRequest

const fetchMenuItems = () => http.get('/menu')
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

const getMenuItems = () => {
  if (!menuRequest) {
    menuRequest = fetchMenuItems()
      .catch((error) => {
        menuRequest = undefined
        throw error
      })
  }

  return menuRequest
}

export const refreshMenuItems = () => {
  if (!menuRefreshRequest) {
    menuRefreshRequest = fetchMenuItems()
      .finally(() => {
        menuRefreshRequest = undefined
      })
  }

  return menuRefreshRequest
}

export default getMenuItems
