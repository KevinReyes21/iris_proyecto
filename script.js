
const modelos = [
  {
    url: "modelos/modelo1.glb",
    texto: "Modelo 3D - Zona arqueológica"
  },
  {
    url: "modelos/modelo2.glb",
    texto: "Modelo 3D - Levantamiento topográfico"
  }
];

let index = 0;

function cambiarModelo(direccion) {
  index = (index + direccion + modelos.length) % modelos.length;

  document.getElementById("visor3d").src = modelos[index].url;
  document.getElementById("descripcion").innerText = modelos[index].texto;
}


function cambiarModelo(direccion) {
  const visor = document.getElementById("visor3d");

  // fade out
  visor.classList.add("fade-out");

  setTimeout(() => {
    index = (index + direccion + modelos.length) % modelos.length;

    visor.src = modelos[index].url;
    document.getElementById("descripcion").innerText = modelos[index].texto;

    // fade in
    visor.classList.remove("fade-out");
  }, 300); // tiempo antes de cambiar modelo
}



