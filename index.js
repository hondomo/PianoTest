const CSVToJSON = require("csvtojson")
const JSONToCSV = require("json2csv").parse;
const FileSystem = require("fs");
const axios = require('axios');
const _find = require('lodash/find')
const _get = require('lodash/get')
const _merge = require("lodash/merge")

const axiosInstance = axios.create({
  baseURL: 'https://sandbox.tinypass.com/api/v3',
});

const getCSVToJSONPromises = (filePaths) => {
  return filePaths.map(path => {
    return CSVToJSON().fromFile(path)
  })
}

const fetchExistingUsers = () => {
  console.log('Fetching Existing Users...')
  const api_token = 'zziNT81wShznajW2BD5eLA4VCkmNJ88Guye7Sw4D'
  const aid = 'o1sRRZSLlw'
  const userURL = `/publisher/user/list?aid=${aid}&api_token=${api_token}`
  
  return axiosInstance
    .post(userURL)
    .then(resp => {
      // Normalize the data to match the structure in the csv files
      return _get(resp, 'data.users', []).map(user => {
        return {
          email: user.email,
          user_id: user.uid,
        }
      })
    })
    .catch(error => console.error(error.message))
}

const filePathsAreStrings = (filePaths) => {
  let pathsAreStrings = true

  filePaths.forEach(path => {
    if (typeof path !== 'string') {
      pathsAreStrings = false
    }
  })

  return pathsAreStrings
}

const mergeUserSources = (sources) => {
  return sources.reduce((acc, current) => {
    return acc.map(user => {
      const existingUser = _find(current, potentialMatch => {
        const idMatch = user.user_id === potentialMatch.user_id
        const emailMatch = user.email === potentialMatch.email

        return idMatch || emailMatch
      })
      return _merge(user, existingUser || {})
    })
  }, sources[0])
}

const convertResultToCSVAndSave = (result) => {
  try {
    console.log('Converting user data to CSV file....')
    FileSystem.writeFileSync(
      "./result.csv",
      JSONToCSV(result, { fields: Object.keys(result[0])})
    )
    console.log('File saved to "./result.csv"')
  }
  catch(error) {
    console.error(error)
  }
}

const application = (filePaths) => {
  console.log('Parsing Files....')

  const inputIsValid = filePaths && filePaths.length && filePathsAreStrings(filePaths)

  if (!inputIsValid) {
    console.warn('You must provide an array of file paths as strings')
    return
  }

  const promises = [
    ...getCSVToJSONPromises(filePaths),
    fetchExistingUsers()
  ]

  Promise.all(promises)
    .then(sources => {
      const mergedUsers = mergeUserSources(sources)
      console.log('Parsing complete.')
      convertResultToCSVAndSave(mergedUsers)
    })
    .catch(error => { 
      console.error(error.message)
    })
}

application(['./file1.csv', './file2.csv'])