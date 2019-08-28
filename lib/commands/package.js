const fs = require('fs')
const path = require('path')
const request = require('request')
const log = require('../utils/log')
const properties = require('../utils/properties')
const utils = require('../utils/utils')

function create(options, ip) {
  const curTime = new Date().getTime();

  const zip = path.join(
    properties.buildDir,
    options.flavor + options.name + '.zip'
  )

  var packageKeyOverride = properties[options.packageConfig + ".packageKey"]
  var packageKey = packageKeyOverride || properties.packageKey 

  if (packageKey == null) {
    log.error("packageKey field is missing (ukor.properties)")
    return
  }

  const form = {
    app_name: getAppName(options),
    mysubmit: 'Package',
    pkg_time: curTime,
    passwd: packageKey
  }

  request.post(
    {
      url: 'http://' + ip + '/plugin_package',
      formData: form,
      auth: options.auth
    },
    (error, response, body) => {
      if (error || !body) {
        log.error('Generate package failed:')
        log.error(error)
      } else {
        urls = parseBody(body)

        if (urls) {
          packageName = getPackageName(urls)
          if (packageName != null) {
            download(options, ip, packageName)
          }
        } else {
          log.error('Falied to find the package in body response')
          log.info('TIP: Try to rekey your device')
        }
      }
    }
  )
}

function download(options, ip, packageName) {
  request.get(
    {
      url: 'http://' + ip + '/' + packageName,
      auth: options.auth
    },
    (error, response, body) => {
      if (error || !body) {
        log.error('Download package failed:')
        log.error(error)
        log.error('Failture http code:' + response.statusCode)
      } else {
        log.verbose('Package was founded on roku device')
        log.info('Creating package...')
      }
    }
  ).pipe(fs.createWriteStream(getPackagePath(options)))
}

function getPackagePath(options) {
  return [
    properties.buildDir,
    getPackageFileName(options)
  ].join('/').concat('.pkg')
}

function getPackageName(urls) {
  let result = null

  urls.map(function(val) {
    result = val.split('"')[1];
  })

  return result
}

function getAppName(options) {
  return [
    properties.name,
    options.flavor
  ].join('/')
}

function getPackageFileName(options) {
  var packageFileName = properties[options.packageConfig + ".packageFileName"] || properties["packageFileName"] || options.flavor
  let version = utils.getVersionStringFromManifest(options)
  let gitBranch = utils.getCurrentGitBranch()

  packageFileName = packageFileName.replace('%flavor%', options.flavor)
  packageFileName = packageFileName.replace('%version%', version)
  packageFileName = packageFileName.replace('%branch%', gitBranch)
  
  return packageFileName
}

function parseBody(body) {
  return body.match(/<a href=(.*?)>/g)
}

module.exports = {
  package: (options, ip) => {
    create(options, ip)
  }
}
