# rh-auth [IN DEVELOPMENT]



https://user-images.githubusercontent.com/3428964/176740426-899bd900-ed5f-4286-8bac-7a8c793cfb1a.mov



## Run w/ Docker

Start the frontend application using web-dev-server and start the Keycloak server.

```
docker-compose up --build
```

Visit

```
http://my-app.traefik.me/
```

Click on 'login'. You will be redirect to the Keycloak SSO login. Enter the following creds:

```
username: test
password: test
```

You will be redirected back to your application. Refresh the browser and it should brokered the JWT printed to the screen.
