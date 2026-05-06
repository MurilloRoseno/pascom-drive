// Drive.js — DriveApp folder/file operations.

function getSourceFolder() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('SOURCE_FOLDER_ID')
  );
}

function getOriginaisFolder() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('ORIGINAIS_FOLDER_ID')
  );
}

function getAmostrasFolder() {
  return DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('AMOSTRAS_FOLDER_ID')
  );
}

function listNewFiles() {
  var folder = getSourceFolder();
  var iterator = folder.getFiles();
  var result = [];
  while (iterator.hasNext()) {
    var file = iterator.next();
    if (file.getMimeType().indexOf('image/') === 0) {
      result.push(file);
    }
  }
  return result;
}

function copyFileToFolder(file, destinationFolder, newName) {
  return file.makeCopy(newName, destinationFolder);
}

function getShareableLink(file) {
  return 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing';
}

if (typeof module !== 'undefined') {
  module.exports = { getSourceFolder, getOriginaisFolder, getAmostrasFolder, listNewFiles, copyFileToFolder, getShareableLink };
}
