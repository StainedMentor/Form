const Calendar = () => {
return(
  <div>
    <label htmlFor="date">Flight date:</label><br/>
    <input type="date" id="date" name="date" required onChange={ (e) =>
      {
        var obj = e.target
        var day = new Date(obj.value).getUTCDay()
        if([6,0].includes(day)){
          obj.setCustomValidity("Must be mon-fri.")
        }
        else {
          obj.setCustomValidity("")
        }
      }
    }/><br/>

  </div>
  )
};

export default Calendar
