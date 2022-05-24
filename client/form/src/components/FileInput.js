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
    <div className="Form-spacer">
      <label className="Form-element" htmlFor="files">Transport documents:</label>
      <input className="Form-element" type="file" id="files" name="files" multiple accept=".jpg,.png,.doc,.docx,.pdf"/>
      <div className="Drop-area" onDragEnter={(e) =>prevent(e)} onDragOver={(e) =>prevent(e)} onDrop={(e) => drop(e)}>
        <p className="Drop-text">Drop here</p>
      </div>
    </div>

  )
}

export default FileInput
