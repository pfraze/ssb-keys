var tape = require('tape')
var ssbkeys = require('../')
var crypto = require('crypto')
var path = '/tmp/ssb-keys_'+Date.now()

tape('create and load async', function (t) {
  console.log(ssbkeys)
  ssbkeys.create(path, function(err, k1) {
    if (err) throw err
    ssbkeys.load(path, function(err, k2) {
      if (err) throw err
      console.log(k1, k2)
      t.equal(k1.id.toString('hex'), k2.id.toString('hex'))
      t.equal(k1.private.toString('hex'), k2.private.toString('hex'))
      t.equal(k1.public.toString('hex'), k2.public.toString('hex'))
      t.end()
    })
  })
})

tape('create and load sync', function (t) {
  var k1 = ssbkeys.createSync(path+'1')
  var k2 = ssbkeys.loadSync(path+'1')
  t.equal(k1.id.toString('hex'), k2.id.toString('hex'))
  t.equal(k1.private.toString('hex'), k2.private.toString('hex'))
  t.equal(k1.public.toString('hex'), k2.public.toString('hex'))
  t.end()
})

tape('sign and verify a javascript object', function (t) {

  var obj = require('../package.json')

  console.log(obj)

  var keys = ssbkeys.generate()
  var sig = ssbkeys.signObj(keys.private, obj)
  console.log(sig)
  t.ok(sig)
  t.ok(ssbkeys.verifyObj(keys, sig))
  t.ok(ssbkeys.verifyObj({public: keys.public}, sig))
  t.end()

})

//allow sign and verify to also take a separate key
//so that we can create signatures that cannot be used in other places.
//(i.e. testnet) avoiding chosen protocol attacks.
tape('sign and verify a hmaced object javascript object', function (t) {

  var obj = require('../package.json')
  var hmac_key = crypto.randomBytes(32)
  var hmac_key2 = crypto.randomBytes(32)

  var keys = ssbkeys.generate()
  var sig = ssbkeys.signObj(keys.private, hmac_key, obj)
  console.log(sig)
  t.ok(sig)
  //verify must be passed the key to correctly verify
  t.notOk(ssbkeys.verifyObj(keys, sig))
  t.notOk(ssbkeys.verifyObj({public: keys.public}, sig))
  t.ok(ssbkeys.verifyObj(keys, hmac_key, sig))
  t.ok(ssbkeys.verifyObj({public: keys.public}, hmac_key, sig))
  //a different hmac_key fails to verify
  t.notOk(ssbkeys.verifyObj(keys, hmac_key2, sig))
  t.notOk(ssbkeys.verifyObj({public: keys.public}, hmac_key2, sig))

  //assert that hmac_key may also be passed as base64

  hmac_key = hmac_key.toString('base64')
  hmac_key2 = hmac_key2.toString('base64')

  var otherKeys = ssbkeys.generate()
  var otherSig = ssbkeys.signObj(otherKeys.private, hmac_key, obj)
  console.log(sig)
  t.ok(sig)
  //verify must be passed the key to correctly verify
  t.notOk(ssbkeys.verifyObj(otherKeys, otherSig))
  t.notOk(ssbkeys.verifyObj({public: otherKeys.public}, otherSig))
  t.ok(ssbkeys.verifyObj(keys, hmac_key, sig))
  t.ok(ssbkeys.verifyObj({public: otherKeys.public}, hmac_key, otherSig))
  //a different hmac_key fails to verify
  t.notOk(ssbkeys.verifyObj(otherKeys, hmac_key2, otherSig))
  t.notOk(ssbkeys.verifyObj({public: otherKeys.public}, hmac_key2, otherSig))

  t.end()

})

tape('seeded keys, ed25519', function (t) {

  var seed = crypto.randomBytes(32)
  var k1 = ssbkeys.generate('ed25519', seed)
  var k2 = ssbkeys.generate('ed25519', seed)

  t.deepEqual(k1, k2)

  t.end()

})

tape('ed25519 id === "@" ++ pubkey', function (t) {

  var keys = ssbkeys.generate('ed25519')
  t.equal(keys.id, '@' + keys.public)

  t.end()

})

tape('alternative "test" feed type', function (t) {
  const newFeedType = {
    name: 'test',
    object: {
    generate: () => {
      return {
        name: newFeedType.name,
        public: crypto.randomBytes(32).toString('hex'),
        private: crypto.randomBytes(32).toString('hex')
      }
    },
    sign: (privateKey, message) => message,
    verify: () => true
    }
  }

  ssbkeys.use(newFeedType.name, newFeedType.object)

  const keys = ssbkeys.generate(newFeedType.name)
  t.assert(keys.id.endsWith(newFeedType.name), 'using new test feed type')

  const signedFoo = ssbkeys.signObj(keys, 'foo')
  t.assert(signedFoo, 'foo', 'signature works')

  const isValid = ssbkeys.verifyObj(keys, 'foo')
  t.assert(isValid, true, 'verification works')
  t.end()
})

