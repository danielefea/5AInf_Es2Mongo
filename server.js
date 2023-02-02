//Installato e richiesto il modulo di mongodb
let mongo = require("mongodb");
//Prelevo la parte del modulo per la gestione del client mongo
let mongoClient = mongo.MongoClient;
let  urlServerMongoDb = "mongodb://localhost:27017/";


let http = require("http");
let url = require("url");

let database = "5AInf_2";

//DEFINISCO IL SERVER
let json, op;
let server = http.createServer(function(req, res){
    //Avverto il browser che ritorno un oggetto JSON
    res.setHeader('Content-Type', 'application/json');

    //Decodifico la richiesta ed eseguo la query interessata
    let scelta = (url.parse(req.url)).pathname;
    switch(scelta){
        case "/q1":
            find(res, "persone", {nome:/^L/},{});
            break;

        case "/q2":
            find(res, "voti", {},{});
        break;

        case "/q3":
            find(res, "voti", {codP:4},{voto:1});
        break;

        case "/q4":
            remove(res, "persone", {});
        break;

        //Dato il nome di una persona ritornare i suoi voti
        case "/q5":
            let persona = "Leopoldo";
            find2(res, "persone", {nome:persona}, {_id:1}, function(ris){
                //res.end(JSON.stringify(ris));
                //Prendere il codice
                console.log(ris); //ARRAY
                let id = ris[0]._id; 
                console.log(id);
                console.log({codP:id});

                //Effettuare la seconda query
                //RICORDARSI CHE è PUNTIGLIOSO SUI TIPI
                find2(res, "voti", {codP:parseInt(id)}, {codP:0}, function(ris){
                    /*for(let i in ris){
                        ris[i].persona = persona;
                    }*/
                    /*for(let item of ris){
                        item.persona = persona;
                    }*/
                    ris.forEach(element => {
                        element.persona = persona;
                    });

                    res.end(JSON.stringify(ris));
                });
            });
            break;

        case "/q6":
            /* L'ordine delle funzione è fondamentale */
            op = [
                {$match:{nome:/o$/}}, //FIND / WHERE
                {$project:{_id:0}},//SELECT
                {$limit:2},  
                {$sort:{nome:1}}, //Se metto sort prima di limit ci sarebbe Giancarlo come primo
                /*
                    group:{ indico tutti gli attributi 
                        che verranno calcolati e 
                        visualizzati}
                */
                {$group:{_id:{}, contPersone:{$sum:1}}},
                {$project:{_id:0}}
            ];
            aggregate(res, "persone", op);
            break;

        case "/q7":
            /* L'ordine delle funzione è fondamentale */
            op = [
                {$group:{_id:{persona:"$codP"}, contVoti:{$sum:1}}}
            ];
            aggregate(res, "voti", op);
            break;
        
        case "/q8":
            //Select * from persone
            find(res, "persone", {}, {});
            break;
        
        case "/u1":
            updateOne(res, "persone", {_id:"7"}, {$set:{nome:"Giuseppe Maria", cognome:"Bianchi"}});
            break;

        case "/u2":
            replaceOne(res, "persone", {_id:"7"}, {nome:"Giuseppe"});
            break;

        

        case "/i1":
            insertMany(res, "persone", 
            [
                {_id:"1", nome:"Francesca"},
                {_id:"2", nome:"Leonardo"},
                {_id:"3", nome:"Jessica"},
                {_id:"4", nome:"Leopoldo"},
                {_id:"5", nome:"Giancarlo"},
                {_id:"6", nome:"Renata"},
                {_id:"7", nome:"Giuseppe"}
            ]
            ,{});
            break;

        case "/i2":
            insertMany(res, "voti", 
            [
                { codP:1, voto:10},
                { codP:2, voto:7},
                { codP:3, voto:3},
                { codP:4, voto:4},
                { codP:4, voto:3},
                { codP:5, voto:5},
                { codP:6, voto:6},
                { codP:7, voto:7},
                { codP:7, voto:4},
                { codP:7, voto:5}
            ]
            ,{});
            break;
        
        default:
            json = {cod:-1, desc:"Nessuna query trovata con quel nome"};
            res.end(JSON.stringify(json));
    }
});

server.listen(8888, "127.0.0.1");
console.log("Il server è in ascolto sulla porta 8888");

function creaConnessione(nomeDb, response, callback){
    console.log(mongoClient);
    let promise = mongoClient.connect(urlServerMongoDb);
    promise.then(function(connessione){
        callback(connessione, connessione.db(nomeDb))
    });
    promise.catch(function(err){
        json = {cod:-1, desc:"Errore nella connessione"};
        response.end(JSON.stringify(json));
    });
}

function find2(res, col, obj, select, callback){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).find(obj).project(select).toArray();
        promise.then(function(ris){
            conn.close();
            callback(ris);
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function find(res, col, obj, select){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).find(obj).project(select).toArray();
        promise.then(function(ris){
            //console.log(ris);
            obj = { cod:0, desc:"Dati trovati con successo", ris};
            res.end(JSON.stringify(obj));
            conn.close();
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

/*
    aggregate -> aggregazione di funzioni di ricerca

    opzioni -> array di oggetti dove ogni oggetto è un 
            filtro che vogliamo applicare alla collezione

*/
function aggregate(res, col, opzioni){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).aggregate(opzioni).toArray();
        promise.then(function(ris){
            //console.log(ris);
            obj = { cod:0, desc:"Dati trovati con successo", ris};
            res.end(JSON.stringify(obj));
            conn.close();
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function limit(res, col, obj, select, n){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).find(obj).project(select).limit(n).toArray();
        promise.then(function(ris){
            //console.log(ris);
            obj = { cod:0, desc:"Dati trovati con successo", ris};
            res.end(JSON.stringify(obj));
            conn.close();
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function sort(res, col, obj, select, orderby){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).find(obj).project(select).sort(orderby).toArray();
        promise.then(function(ris){
            //console.log(ris);
            obj = { cod:0, desc:"Dati trovati con successo", ris};
            res.end(JSON.stringify(obj));
            conn.close();
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function cont(res, col, query){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).countDocuments(query);
        promise.then(function(ris){
            //console.log(ris);
            obj = { cod:0, desc:"Dati trovati con successo", ris};
            res.end(JSON.stringify(obj));
            conn.close();
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function cont2(res, col, query){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).count(query);
        promise.then(function(ris){
            //console.log(ris);
            obj = { cod:0, desc:"Dati trovati con successo", ris};
            res.end(JSON.stringify(obj));
            conn.close();
        });

        promise.catch(function(error){
            obj = { cod:-2, desc:"Errore nella ricerca"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function insertOne(res, col, obj){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).insertOne(obj); 
        promise.then(function(ris){
            json = { cod:1, desc:"Insert in esecuzione", ris };
            res.end(JSON.stringify(json));
            conn.close();
        });
        promise.catch(function(err){
            obj = { cod:-2, desc:"Errore nell'inserimento"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function insertMany(res, col, array){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).insertMany(array); 
        promise.then(function(ris){
            json = { cod:1, desc:"Insert in esecuzione", ris };
            res.end(JSON.stringify(json));
            conn.close();
        });
        promise.catch(function(err){
            obj = { cod:-2, desc:"Errore nell'inserimento"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function updateOne(res, col, where, modifica){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).updateOne(where, modifica); 
        promise.then(function(ris){
            json = { cod:1, desc:"Update effettuata", ris };
            res.end(JSON.stringify(json));
            conn.close();
        });
        promise.catch(function(err){
            obj = { cod:-2, desc:"Errore nell'update"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function replaceOne(res, col, where, nuovoOggetto){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).replaceOne(where, nuovoOggetto); 
        promise.then(function(ris){
            json = { cod:1, desc:"Update effettuata", ris };
            res.end(JSON.stringify(json));
            conn.close();
        });
        promise.catch(function(err){
            obj = { cod:-2, desc:"Errore nell'update"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}

function remove(res, col, where){
    creaConnessione(database, res, function(conn, db){
        let promise = db.collection(col).deleteMany(where); 
        promise.then(function(ris){
            json = { cod:1, desc:"Remove in esecuzione", ris };
            res.end(JSON.stringify(json));
            conn.close();
        });
        promise.catch(function(err){
            obj = { cod:-2, desc:"Errore nella cancellazione"}
            res.end(JSON.stringify(obj));
            conn.close();
        });
    });
}