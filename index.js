let express = require("express"),
  morgan = require("morgan"),
  bodyParser = require("body-parser"),
  jsonParser = bodyParser.json(),
  { PORT } = require("./config"),
  app = express(),
  server;

app.use(morgan("dev"));


app.get("/users", (req, res) => {
  UserList.getAll()
    .then(userList => {
      return res.status(200).json(userList);
    })
    .catch(error => {
      console.log(error);
      res.statusMessage = "Hubo un error de conexion con la BD";
      return res.status(500).send();
    });
});

app.post('/signIn', jsonParser, (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  // Validates inputs
  if (!username || username == "") {
    res.statusMessage = "Nombre de usuario no proporcionado";
    return res.status(406).send();
  }

  if (!password || password == "") {
    res.statusMessage = "Contraseña no proporcionada";
    return res.status(406).send();
  }

  // Validates if user exists
  UserList.getUserByUsername(username)
    .then(user => {
      // User exists
      if (user) {
        // Stores hashed password of user
        let hashedPassword = user.password;

        // Compares input password to saved password in DB
        bcrypt
          .compare(password, hashedPassword)
          .then(result => {
            // Password matches
            if (result) {
              let data = {
                username
              };
              // Create token
              let token = jwt.sign(data, "secret", {
                expiresIn: 60 * 30
              });

              return res.status(200).json({ token });
              // Password doesn't match
            } else {
              console.log("Contraseña incorrecta");
              res.statusMessage = "Contraseña incorrecta";
              return res.status(400).send();
            }
          })
          .catch(error => {
            throw Error(error);
          });
      } else {
        // User doen't exist
        console.log("error");
        res.statusMessage = "Usuario no encontrado";
        return res.status(400).send();
      }
    })
    .catch(error => {
      res.statusMessage = "Hubo un error de conexión con la BD";
      return res.status(500).send();
    });
});

app.put(':username/edit', jsonParser, (req, res) => {
  let userN = req.params.username;
  let token = req.headers.authorization;
  token = token.replace("Bearer ", "");
  // Validate token
  jwt.verify(token, "secret", (err, user) => {
    // Token not valid
    if (err) {
      res.statusMessage = "Token no válido";
      return res.status(401).send();
    }

    // Token valid
    let {username, fName, lName, email, password, confirmPassword, bDate} = req.body;
    //let userN = req.params.username;

    if(userN != user.username || username != user.username){
      res.statusMessage = "El usuario de la sesión activa no coincide";
      return res.status(400).send();
    }

    let newUser = {};

    //Validate inputs
    if (password && password != "") {
      newUser.password = password;

      if(!confirmPassword || confirmPassword == "" ){
        res.statusMessage = "Contraseña de confirmación no proporcionada";
        return res.status(400).send();
      }

    }

    if (password != confirmPassword) {
      res.statusMessage = "Contraseñas no coinciden";
      return res.status(400).send();
    }

    if (username && username != "") {
      newUser.username = username;
    }

    if (fName && fName != "") {
      newUser.fName = fName;
    }

    if (lName && lName != "") {
      newUser.lName = lName;
    }

    if (email && email != "") {
      newUser.email = email;
    }

    if (bDate && bDate != "") {
      newUser.bDate = bDate;
    }

    // Validate if user exists
    UserList.updateUser( user.username, newUser )
      .then ( user => {
        // User exist
        if( user ){

          let data = {
            username
          };
          // Create token
          token = jwt.sign(data, "secret", {
            expiresIn: 60 * 30
          });
          
          res.statusMessage = "Información del usuario actualizada exitosamente";
          return res.status(200).json({user, token})
        }
        // User does not exist
        else{
          res.statusMessage = "Usuario no encontrado";
          return res.status(404).send();
        }

      })
      .catch( error => {
        res.statusMessage = "Error en la BD al actualizar la infromación del usuario";
        return res.status(500);
      })

  });
});

/* Server config */
function runServer(port) {
    server = app
        .listen(port, () => {
            console.log("App is running on port " + port);
        })
        .on("error", err => {
            return reject(err);
        });
}

function closeServer() {
    console.log("Closing the server");
    server.close(err => {
        if (err) {
            return reject(err);
        } else {
            resolve();
        }
    });
}

runServer(PORT);

module.exports = { app, runServer, closeServer };
