let express = require("express"),
  morgan = require("morgan"),
  bodyParser = require("body-parser"),
  jsonParser = bodyParser.json(),
  dialogflow = require('dialogflow'),
  uuid = require('uuid'),
  { PORT } = require("./config"),
  app = express(),
  server;

app.use(morgan("dev"));


/**
 * Send a query to the Dialogflow agent, and return the query result
 * @param {string} textInput The user's input
 * @param {string} projectId The project to be used
 */
async function runSample(textInput, projectId = 'covid-app-275822') {
  // A unique identifier for the given session
  const sessionId = uuid.v4();

  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
    // Path to the key file
    keyFilename: "/Users/gerardosilvarazo/info-med webhook/key.json"
  });
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: textInput,
        // The language used by the client (es) for spanish
        languageCode: 'es',
      },
    },
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  // console.log('Detected intent');
  const result = responses[0].queryResult;
  // console.log(`  Query: ${result.queryText}`);
  // console.log(`${result.fulfillmentText}`);
  return await result;
}




/**
 * GET - API Endpoint
 * Returns response to the intent detected by Dialogflow
 */
app.get("/info-med-bot/api/detectIntent/:id", jsonParser, (req, res) => {

  // Validate HTTP Request's Body
  if (!req.body.textInput) {
    res.statusMessage = "No es posible responder, falta entrada.";
    return res.status(406).send();
  }

  // Store user id and textInput from request
  let textInput = req.body.textInput;
  let id = req.params.id;

  // Async function to call runSample and get a response from dialogflow
  (async () => {
    let result = await runSample(textInput);

  // Intent not found
  if (!result.intent) {
    res.statusMessage = "No se ha encontrado una respuesta a la entrada.";
    return res.status(404).send();
  }

  // Returns object with all results
  return res.status(200).json(result);
  })();
});

/**
 * Run the server in specific port
 */
function runServer(port) {
    server = app
        .listen(port, () => {
            console.log("App is running on port " + port);
        })
        .on("error", err => {
            return reject(err);
        });
}

/**
 * Close the server
 */
function closeServer() {
    console.log("Closing the server");
    server.close(err => {
        if (err) {
            return reject(err);
        }
    });
}

runServer(PORT);

module.exports = { app, runServer, closeServer };



