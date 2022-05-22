import Cargo from "./Cargo"
import Calendar from "./Calendar"
import FileInput from "./FileInput"
const Form = ({title}) => {

  return (
    <div>
      <h2>{title}</h2>
      <form>
        <label htmlFor="from">Origin:</label><br/>
        <input type="text" id="from" name="from" required/><br/>

        <label htmlFor="to">Destination:</label><br/>
        <input type="text" id="to" name="to" required/><br/>

        <label htmlFor="planeType">Plane type:</label>
        <select  id="planeType" name="planeType">
          <option value="A380">Airbus A380</option>
          <option value="B747">Boeing 747</option>
        </select><br/>

      
        <FileInput/>
        <Calendar/>
        <Cargo/>

        <input type="submit" value="Submit"/>
      </form>
    </div>
  )
}
export default Form
