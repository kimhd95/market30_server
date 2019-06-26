# food-api-server

food-chatbot API Server

ORM : Sequelize

### DB ERD

2019/01/18

![diagram](./readme_img/diagram.png)

### Basic Router

```
/api/v1/users/
```

### HTTP Status Code

| Status Code | 내용                 |
| ----------- | -------------------- |
| 200         | 정상                 |
| 401         | no parameter         |
| 403         | no result            |
| 500         | 내부 서버 or DB 오류 |



### 새로운 API 추가하기

1. **[server/services/users/](./server/services/users/)**에 새로운 API 모듈 추가하기
2. **[server/controllers/apis/users/index.js](./server/controllers/apis/users/index.js)**에 라우터 설정


### API

**verifyAPIKEY**

- API 요청이 왔을 때, API-KEY를 검사해서 사용가능 여부를 판단하게 한다.
  - 현재는 개발 단계이기 때문에, 사용하지 않음.

**[회원정보 업데이트 (updateUser)](./readme_img/updateUser.md)**

- ```
  [POST] /update_user  (+request_body)
  ```

### TODO?

- 기존 카카오톡 기반 플랫폼과 달리 웹 기반이기 때문에, 세션처리가 용이하다.
