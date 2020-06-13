let express = require("express"),
  morgan = require("morgan"),
  bodyParser = require("body-parser"),
  jsonParser = bodyParser.json(),
  dialogflow = require('@google-cloud/dialogflow'),
  uuid = require('uuid'),
  { PORT, FAQ, FAQ_ID, FAQ_KEY, QUESTIONNAIRE, QUESTIONNAIRE_ID, QUESTIONNAIRE_KEY } = require("./config"),
  app = express(),
  server;

app.use(morgan("dev"));

/** 
 * Send a query to the Dialogflow agent, and return the query result
 * @param {string} projectId The ID of the project in Dialogflow
 * @param {string} text The query of the user
 * @param {outputContexts} contexts The contexts from Dialogflow's previous response
 * @param {string} key The name of the file that contains the API's client-key
 */
async function findIntent(projectId, text, contexts, key) {
  // A unique identifier for the given session
  const sessionId = uuid.v4();

  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
    // Path to the key file
    keyFilename: __dirname+key
  });
  const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: text,
        // The language used by the client (es) for spanish
        languageCode: 'es',
      },
    },
    queryParams: {
      contexts: contexts
    },
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;
  return await result;
}


/**
 * POST - API Endpoint
 * Receives as parameter the agent to query to.
 * Receives as body the user's query and contexts from conversation
 * Returns JSON response to the intent detected by the corresponding agent
 */
app.post("/api/:agent/detectIntent", jsonParser, (req, res) => {

  // Validate HTTP Request params
  if (!req.params.agent || req.params.agent != FAQ && req.params.agent != QUESTIONNAIRE) {
    res.statusMessage = "Request param is wrong or missing.";
    return res.status(406).send();
  }

  // Validate HTTP Request's Body
  if (!req.body.query) {
    res.statusMessage = "Request's body message incomplete.";
    return res.status(406).send();
  }

  let projectId, apiKey;

  // Initialize variables depending on the agent
  if (req.params.agent == FAQ) {
    projectId = FAQ_ID;
    apiKey = FAQ_KEY;
  }
  else {
    projectId = QUESTIONNAIRE_ID;
    apiKey = QUESTIONNAIRE_KEY;
  }

  // Store query from request
  let query = req.body.query; // User's text
  let contexts = req.body.contexts; // Intent's contexts

  // Async function to call findIntent() and get a response to the user input from Dialogflow
  (async () => {
    let result = await findIntent(projectId, query, contexts, apiKey);

  // Intent not found
  if (!result.intent) {
    res.statusMessage = "No se ha encontrado una respuesta a la entrada.";
    return res.status(404).send();
  }

  // Return JSON object with API's response
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



