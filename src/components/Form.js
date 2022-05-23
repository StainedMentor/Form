import Cargo from "./Cargo"
import Calendar from "./Calendar"
import FileInput from "./FileInput"
import React from "react"
const Form = ({title}) => {
  const [cargo, setCargo] = React.useState([])
  var limit = 35

  const addCargo = () => {
    setCargo([...cargo, <Cargo limit={limit} key={cargo.length}/>])
  }
  const changePlane = (e) => {
    const type = e.target.value
    console.log(cargo)
    if(type == "A380") limit = 35
    else limit = 38

  }
  return (
    <div className="App-form">
      <h2>{title}</h2>
      <form className="App-form">
        <label className="Form-element" htmlFor="from">Origin:</label>
        <input className="Form-spacer" type="text" id="from" name="from" required/>

        <label className="Form-element" htmlFor="to">Destination:</label>
        <input className="Form-spacer" type="text" id="to" name="to" required/>
        <div className="Form-element Form-spacer">
          <label htmlFor="planeType">Plane type:</label>
          <select id="planeType" name="planeType" onChange={(e)=>changePlane(e)}>
            <option value="A380">Airbus A380</option>
            <option value="B747">Boeing 747</option>
          </select>
        </div>

        <FileInput/>
        <Calendar/>
        <div id="cargoSpace">
          {cargo}
          <button type="button" id="moreCargo" onClick={()=>addCargo()}>Add cargo</button>

        </div>
        <input type="submit" value="Submit"/>
      </form>

    </div>
  )
}
export default Form
