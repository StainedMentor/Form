
const Cargo = (props) => {
  return (
    <div className="Cargo-container">
      <label htmlFor="name">Name:</label>
      <input type="text" id="name" name="name" required/>
      <label htmlFor="weight">Weight:</label>
      <input min="0" max={props.limit} type="number" id="weight" name="weight" required/>
      <div>
        <input type="checkbox" id="danger"/>
        <label htmlFor="danger"> Dangerous cargo</label>
        </div>
    </div>
  )
}

export default Cargo
