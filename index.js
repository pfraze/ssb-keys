'use strict';

var ssbcrypto = require('./ssb-crypto')

var crypto   = require('crypto')
var ecc      = require('eccjs')
var fs       = require('fs')
var mkdirp   = require('mkdirp')
var path     = require('path')
var k256     = ecc.curves.k256

function empty(v) { return !!v }

function constructKeys() {
  var privateKey = crypto.randomBytes(32)
  var k          = ssbcrypto.keysToBase64(ecc.restore(k256, privateKey))
  k.keyfile      = [
  '# this is your SECRET name.',
  '# this name gives you magical powers.',
  '# with it you can mark your messages so that your friends can verify',
  '# that they really did come from you.',
  '#',
  '# if any one learns this name, they can use it to destroy your identity',
  '# NEVER show this to anyone!!!',
  '',
  k.private.toString('hex'),
  '',
  '# WARNING! It\'s vital that you DO NOT edit OR share your secret name',
  '# instead, share your public name',
  '# your public name: ' + k.id.toString('hex')
  ].join('\n')
  return k
}

function reconstructKeys(privateKeyStr) {
  privateKeyStr = privateKeyStr
    .replace(/\s*\#[^\n]*/g, '')
    .split('\n').filter(empty).join('')

  var privateKey = (
      !/\./.test(privateKeyStr)
    ? new Buffer(privateKeyStr, 'hex')
    : ssbcrypto.toBuffer(privateKeyStr)
  )

  return ssbcrypto.keysToBase64(ecc.restore(k256, privateKey))
}

exports.load = function(namefile, cb) {
  fs.readFile(namefile, 'ascii', function(err, privateKeyStr) {
    if (err) return cb(err)
    try { cb(null, reconstructKeys(privateKeyStr)) }
    catch (e) { cb(err) }
  })
}

exports.loadSync = function(namefile) {
  return reconstructKeys(fs.readFileSync(namefile, 'ascii'))
}

exports.create = function(namefile, cb) {
  var k = constructKeys()
  mkdirp(path.dirname(namefile), function (err) {
    if(err) return cb(err)
    fs.writeFile(namefile, k.keyfile, function(err) {
      if (err) return cb(err)
      delete k.keyfile
      cb(null, k)
    })
  })
}

exports.createSync = function(namefile) {
  var k = constructKeys()
  mkdirp.sync(path.dirname(namefile))
  fs.writeFileSync(namefile, k.keyfile)
  delete k.keyfile
  return k
}

exports.loadOrCreate = function (namefile, cb) {
  exports.load(namefile, function (err, keys) {
    if(!err) return cb(null, keys)
    exports.create(namefile, cb)
  })
}
exports.loadOrCreateSync = function (namefile) {
  try {
    return exports.loadSync(namefile)
  } catch (err) {
    return exports.createSync(namefile)
  }
}


function combine (a, b) {
  Object.keys(b).forEach(function (key) {
    a[key] = b[key]
  })

  return a
}

module.exports = combine(exports, ssbcrypto)