import './App.css';
import React, {useState} from "react"
import Form from "./components/Form";

function App() {
  const [data, setData] = useState([])
  React.useEffect(() => {
    callBackendAPI().then(res => {
      setData(res.express)
    })

  });
  const callBackendAPI = async () => {

     const response = await fetch("/api")
     const body = await response.json()

     if (response.status !== 200) {
       throw Error(body.message)
     }
     return body
  }

  return (
    <div className="App">
      <header className="App-header">

      <Form title="Shipment">
      </Form>
      {data}
      </header>
    </div>
  );
}

export default App;
