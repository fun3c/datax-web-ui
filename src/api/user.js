import request from '@/utils/request'

const response = { 'code': 200, 'content': { 'data': 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIzLGFkbWluIiwiaXNzIjoiYWRtaW4iLCJleHAiOjE2NDkyMTc2NTgsImlhdCI6MTY0ODYxMjg1OCwicm9sIjoiUk9MRV9VU0VSIn0.VuEmkjOMZ752XknwUmrAzeqV7ntCsfERjR4gYWbS-AyoBwCaevZxHWXBNmmpRUayZEi98Z67IAPXH9h-bLf4aQ', 'roles': ['ROLE_USER'] }}

export function login(data) {
  // return request({
  //   url: '/api/auth/login',
  //   method: 'post',
  //   data
  // })
  // 去掉后台请求，前端mock数据
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(response)
    })
  })
}

export function getInfo() {
  return request({
    url: '/api/user/info',
    method: 'get'
  })
}

export function logout() {
  return request({
    url: '/api/user/logout',
    method: 'post'
  })
}
