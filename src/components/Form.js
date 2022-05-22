import Cargo from "./Cargo"
import Calendar from "./Calendar"
const Form = ({title}) => {

  return (
    <div>
      <h2>{title}</h2>
      <form>
        <label htmlFor="from">Origin:</label><br/>
        <input type="text" id="from" name="from" required/><br/>
        <label htmlFor="to">Destination:</label><br/>
        <input type="text" id="to" name="to" required/><br/>
        <input type="radio" id="A380" name="planeType" value="A380" required/>
        <label htmlFor="A380">Airbus A380</label><br/>
        <input type="radio" id="B747" name="planeType" value="B747" required/>
        <label htmlFor="B747">Boeing 747</label><br/>
        <label htmlFor="files">Transport documents:</label><br/>
        <input type="file" id="files" name="files" multiple accept=".jpg,.png,.doc,.docx,.pdf"/>
        <Calendar/>
        <Cargo/>


        <input type="submit" value="Submit"/>

      </form>

    </div>
  )
}
export default Form
