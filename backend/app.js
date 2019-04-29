// importing expreess
const express = require("express");
// importing sqlite3
const sqlite = require("sqlite3").verbose();
// importing body-parser to parse the data sent in json format
const bodyParser = require("body-parser");
// importing file-system to create database file if it doesnot exists
const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Creating the database if not existed
fs.closeSync(fs.openSync("./poke.db", "a"));

// Creating the instance of the database
let db = new sqlite.Database("./poke.db", err => {
  if (err) {
    return console.log(err);
  }
  console.log("Connected to the database");
});

// Creating table pokemons if not exists
db.run('CREATE TABLE if not exists pokemons(id INTEGER PRIMARY KEY, name TEXT, sprite TEXT, fg TEXT, bg TEXT, desc TEXT )', (err)=>{
  if(err){
    console.log(err);
  }else{
      console.log("pokemons created");
  }
});

// Inserting the pokemon into the database
// POST /api/pokemon/ 
// Input Data : pokemon : { name, sprite, cardColours : { fg, bg, desc }}
// Output data : { id, name, sprite, cardColours : { fg, bg, desc }}
app.post("/api/pokemon/", (req, res) => {
  // Calling the validatePokemon() function to validate the data
  if (validatePokemon(req.body)) {
    var data = req.body.pokemon;
    // Creating insert sqlite query
    var insertQuery =
      "INSERT INTO pokemons(name, sprite, fg, bg, desc) VALUES(? ,? ,? ,? ,? )";
    db.run(
      insertQuery,
      [
        data.name,
        data.sprite,
        data.cardColours.fg,
        data.cardColours.bg,
        data.cardColours.desc
      ],
      function(err) {
        if (err) {
          // If an error found in inserting the data, bad request ( 400 ) is sent back
          return res.status(400).send(err);
        } else {
          var result = { id: this.lastID, ...data };
          // Sending back the passed data by prepending the ID to it
          res.send(result);
        }
      }
    );
  } else {
    // If invalid format is sent, bad request (400) is sent back to client.
    return res.status(400).send({ error: "Invalid details submitted" });
  }
});

// Retrieving the pokemon data from database
// GET /api/pokemon/:id
// Output data : { id, name, sprite, cardColours : { fg, bg, desc }}
app.get("/api/pokemon/:id", (req, res) => {
  var id = req.params.id;
  // Simple select query to retrieve the pokemon from the database
  db.get("SELECT * FROM pokemons WHERE id=?", [id], (err, row) => {
    // IF not found, 404 status code is sent back
    if (err || row == null) return res.status(404).send({ error: "not found" });
    // Else, it sents the data with the required format
    res.send(formatIntoPokemonData(row, id));
  });
});

// Deleting the pokemon in database, based on the ID
// DELETE /api/pokemon/:id 
// Ouput data after deletion : { id, name, sprite, cardColours : { fg, bg, desc }}
app.delete("/api/pokemon/:id", (req, res) => {
  const id = req.params.id;
  // Initially retrieving the data to return it to user
  db.get("SELECT * FROM pokemons WHERE id=?", [id], (err, row) => {
    // If not found, 404 is sent back
    if (err || row == null) return res.status(404).send({ error: "not found" });
    // Running delete query to remove pokemon from the database, based on the ID
    db.run("DELETE FROM pokemons WHERE id=?", [id], err => {
      // If something is wrong, return conflict (409) to the client
      if (err)
        return res
          .status(409)
          .send({ error: "Internal error. Please try again" });
      // Converting the data into respective format
      res.send(formatIntoPokemonData(row, id));
    });
  });
});

// Updating the details of the pokemon based on id
// PATCH /api/pokemon/:id
// Input data : every key is optional here { name, sprite, cardColours }
app.patch("/api/pokemon/:id", (req, res) => {
  // checking for the empty object and invalid cases
  if (
    !req.body.pokemon ||
    (req.body.pokemon && Object.keys(req.body.pokemon).length < 1) ||
    (req.body.pokemon.cardColours &&
      Object.keys(req.body.pokemon).length >= 1 &&
      typeof req.body.pokemon.cardColours !== "object")
  )
    return res.status(400).send({ error: "Invalid details submitted" });
  // merging the data into specified query format
  var data = getUpdateString(req.body.pokemon, req.params.id);
  // Performing the update query
  db.run("UPDATE pokemons SET " + data.str, data.params, err => {
    if (err) {
      // If there is an error, bad request (400) is sent back
      return res.status(400).send(err);
    } else {
      // Else, after updation, search for the pokemon with the ID
      db.get(
        "SELECT * FROM pokemons WHERE id=?",
        [req.params.id],
        (err, row) => {
          // If nothing is found from the ID, send 404 back
          if (err || row == null)
            return res.status(404).send({ error: "Sorry, not found" });
          // Else, return the data in the specific format
          res.send(formatIntoPokemonData(row, req.params.id));
        }
      );
    }
  });
});

// Handing invalid api call
app.get("/*", (req, res) => {
  res
    .status(404)
    .send({ error: "Sorry, requested URL not found on this server" });
});

// validatePokemon() takes data and checks the data is in correct format or not
function validatePokemon(data) {
  if (data.pokemon) {
    var pokemon = data.pokemon;
    if (
      pokemon.name &&
      pokemon.name.length < 1000 &&
      pokemon.name.length > 1 &&
      pokemon.sprite &&
      pokemon.sprite.length < 5000 &&
      pokemon.cardColours
    ) {
      var colors = pokemon.cardColours;
      if (colors.fg && colors.bg && colors.desc) {
        return true;
      }
      return false;
    }
    return false;
  }
  return false;
}

// This function converts the raw data into specified format 
function formatIntoPokemonData(raw, id) {
  return {
    pokemon: {
      id: Number(id),
      name: raw.name,
      sprite: raw.sprite,
      cardColours: { fg: raw.fg, bg: raw.bg, desc: raw.desc }
    }
  };
}

// This function checks the valid update format and return the string and params according to it.
function getUpdateString(data, id) {
  var params = [];
  var str = "";
  if (data.name) {
    str += "name=?, ";
    params.push(data.name);
  }
  if (data.sprite) {
    str += "sprite=?, ";
    params.push(data.sprite);
  }
  if (data.cardColours) {
    if (data.cardColours.fg) {
      str += "fg=?, ";
      params.push(data.cardColours.fg);
    }
    if (data.cardColours.bg) {
      str += "bg=?, ";
      params.push(data.cardColours.bg);
    }
    if (data.cardColours.desc) {
      str += "desc=?, ";
      params.push(data.cardColours.desc);
    }
  }
  str = str.slice(0, -2);
  str += " WHERE id=?";
  params.push(id);
  return {
    str,
    params
  };
}

// Listening on port 8006
app.listen(8006, () => {
  console.log("Server running on port 8006");
});
