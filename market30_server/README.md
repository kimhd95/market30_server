# market30-server

market30 API Server

### API URL

```
http://ec2-13-209-77-121.ap-northeast-2.compute.amazonaws.com:6001/
```
### Basic Router

```
/api/v1/users/
```

### 사용 예시

```
http://ec2-13-209-77-121.ap-northeast-2.compute.amazonaws.com:6001/api/v1/users/___API이름___
```

### HTTP Status Code

| Status Code | 내용                 
| ----------- | --------------------
| 200         | 정상                 
| 401         | no parameter         
| 403         | no result            
| 500         | 내부 서버 or DB 오류


### API

**[바코드 조회]**
```
[post] /verify_barcode
```

##### ***Request Header***
```
{ 'content-type': 'application/json' }
```

##### ***Request Body***
```
{
	"barcode": "001122233"
}
```

##### ***Response Body***

-success 예시-
```
{
	"success": true,
	"data": {"product_name": "쿠크다스", "img_url": "http://image/url"}
}
```

-fail 예시-
```
{
	"success": false,
	"message": "Internal Server or Database Error. err: ~~~~"
}
```

**[상품등록]**
```
[post] /register_product
```

##### ***Request Header***
```
{ 'content-type': 'application/json' }
```

##### ***Request Body***
```
{
	"name": "001122233",
  "seller_id": "kimhd95",
  "price": 10000,
  "count": 10,
  "comment": "사세요",
  "image": "http://~~~~~~"
}
```

##### ***Response Body***

-success 예시-
```
{
	"success": true,
}
```

-fail 예시-
```
{
	"success": false,
	"message": "Internal Server or Database Error. err: ~~~~"
}
```

**[상품목록 로드]**
```
[post] /get_product_list
```

##### ***Request Header***
```
{ 'content-type': 'application/json' }
```

##### ***Request Body***
```
{
	"seller_id": "kimhd95"
}
```

##### ***Response Body***

-success 예시-
```
{
	"success": true,
	"data": [{
    "id": "123",
    "name": "http://image/url",
    "seller_id": "kimhd95",
    "price": 1000,
    "original_price": 3000,
    "count": 6,
    "comment": "사세요",
    "image": "http://~~~~"
  },
  ...]
}
```

-fail 예시-
```
{
	"success": false,
	"message": "Internal Server or Database Error. err: ~~~~"
}
