const FileInput = () => {
  const prevent = (e) => {
    e.preventDefault()
  }
  const drop = (e) => {
    const fileInput = document.getElementById("files")
    fileInput.files = e.dataTransfer.files;
    e.preventDefault();
  };
  return(
    <div>
      <label htmlFor="files">Transport documents:</label><br/>
      <input type="file" id="files" name="files" multiple accept=".jpg,.png,.doc,.docx,.pdf"/>
      <div className="drop-area" onDragEnter={(e) =>prevent(e)} onDragOver={(e) =>prevent(e)} onDrop={(e) => drop(e)}/>
    </div>

  )
}

export default FileInput
