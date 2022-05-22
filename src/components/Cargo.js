
const Cargo = () => {

  return (
    <div>
      <label htmlFor="name">Name:</label><br/>
      <input type="text" id="name" name="name" required/><br/>
      <label htmlFor="wheight">Weight:</label><br/>
      <input type="number" id="weight" name="weight" required/><br/>

      <input type="checkbox" id="danger"/>
      <label htmlFor="danger"> Dangerous cargo</label>

    </div>
  )
}

export default Cargo
