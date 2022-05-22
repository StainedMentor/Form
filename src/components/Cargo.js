
const Cargo = () => {

  return (
    <div>
      <label htmlFor="name">Name:</label><br/>
      <input type="text" id="name" name="name" required/><br/>
      <label htmlFor="wheight">Weight:</label><br/>
      <input type="number" id="weight" name="weight" required/><br/>
      <input type="radio" id="noDanger" name="danger" value="false" required/>
      <label htmlFor="noDanger">Not dangerous</label><br/>
      <input type="radio" id="danger" name="danger" value="true" required/>
      <label htmlFor="danger">Dangerous</label><br/>
    </div>
  )
}

export default Cargo
