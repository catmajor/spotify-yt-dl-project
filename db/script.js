class Search {
  constructor() {
    
  }
}
class Result {
  constructor() {
    
  }
}
class ResultTerm {
  constructor() {
    
  }
}
class Editor {
  constructor() {
    
  }
}
class Cred {
  constructor() {
    
  }
}
class EditorElement  {
  constructor() {
    
  }
}
async function search() {
  
}
async function edit() {
  
}
function populate() {
  
}
function main() {
  const searchElements = {
    searchInput: document.getElementById("search"),
    searchButton: document.getElementById("button")
  }
  const resultElements = {
    resultList: document.getElementById("result-list")
  }
  const credElements = {
    userCred: document.getElementById("usercred"),
    userPass: document.getElementById("userpass"),
    goButton: document.getElementById("gobutton")
  }
  const songEditElements = {
    editBox: document.getElementById("edits")
  }
  const editorElements = {
    credElements,
    songEditElements
  }
  const domElements = {
    searchElements,
    resultElements,
    editorElements
  }
}

main()