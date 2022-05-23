const Calendar = () => {
  const validate = (e) => {
    var obj = e.target
    var day = new Date(obj.value).getUTCDay()
    if([6,0].includes(day)){
      obj.setCustomValidity("Must be mon-fri")
    }
    else {
      obj.setCustomValidity("")
    }
  }
return(
  <div className="Form-spacer">
    <label htmlFor="date">Flight date:</label>
    <input type="date" id="date" name="date" required onChange={ (e) => validate(e)}/>
  </div>
  )
}

export default Calendar
