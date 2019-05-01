const chai = require('chai');
const chaiHTTP = require('chai-http');
const app = require('../app');

chai.use(chaiHTTP);
chai.should();
const id = 1;

// Describing the tests
describe("Pokemons",()=>{
  describe('/POST pokemon', () => {
    it('it should not POST a pokemon without proper format', (done) => {
      // Creating the dummyy data
      let body = {
          pokemon : {
            name: "pikachu",
            sprite: "https://example.com",
            cardColours: {
              fg : "red",
              bg: "blue",
              desc : "Pikachu"
            }
        }
      };
      chai.request(app)
          .post('/api/pokemon/')
          .send(body)
          .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
            done();
          });
    });
  });

  describe("/GET :id",()=>{
    it("should get a single pokemon record", (done) => {
      chai.request(app)
          .get(`/api/pokemon/${id}`)
          .end((err, res) => {
              res.should.have.status(200);
              res.body.should.be.a('object');
              done();
          });
    });
  });
  describe('/PATCH :id, data', () => {
    it('Update a pokemon with id and optional data', (done) => {
      // Creating dummy update data
      let body = {
        pokemon : {
          name: "Bubasaur",
          sprite: "https://somelink.com",
          cardColours: {
            fg : "one",
            bg: "two",
          }
        }
      };
      chai.request(app)
          .patch(`/api/pokemon/${id}`)
          .send(body)
          .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.should.have.property('pokemon');
            done();
          });
    });
  });
  describe('/DELETE :id', () => {
    it('Delete a pokemon with id', (done) => {
      chai.request(app)
          .delete(`/api/pokemon/${id}`)
          .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
            done();
          });
    });
  });
});