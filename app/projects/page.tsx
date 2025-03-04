import Image from "next/image";

export default function Projects() {
   return (
     <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
       <div className="intro-content">
         <div className="intro-text">
           <h1 className="gaysparkles" style={{ color: "white", textAlign: "center" }}>My Projects</h1>
           
           <div className="arcadetext" style={{ textAlign: "left" }}>
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <tbody>
                 <tr>
                   <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                     <h2>Eighty-six</h2>
                   </td>
                   <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                     <p>An AI-enabled drafting tool for writers. <a href="https://eightysix.glitch.me/">eightysix.glitch.me</a></p>
                   </td>
                 </tr>
                 
                 <tr>
                   <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                     <h2>Meal Planner</h2>
                   </td>
                   <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                     <p>A tool for planning meals. <a href="https://eightysix.glitch.me/mealplan">mealplanner.glitch.me</a></p>
                   </td>
                 </tr>
               </tbody>
             </table>
           </div>
         </div>
       </div>
     </div>
   )
}

