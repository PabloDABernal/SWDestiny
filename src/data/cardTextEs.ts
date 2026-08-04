/** Textos de carta traducidos al castellano (SPEC-045), por código.
 *
 * Va APARTE de `cards.json` a propósito: ese snapshot se regenera desde ARH con
 * `npm run cards:snapshot`, así que meter aquí las traducciones las borraría en la próxima
 * regeneración.
 *
 * Se traduce **set a set**, siguiendo el mismo orden en que se implementa el texto. Lo que no esté
 * aquí se sigue mostrando en su inglés original, sin romper nada.
 *
 * ## Reglas de traducción (respetarlas, o los 25 sets acabarán incoherentes entre sí)
 *
 * - Los **tokens** `[special]`, `[shield]`, `[melee]`… se dejan LITERALES: el formateo de SPEC-039
 *   los convierte luego en "Especial", "Escudo", "Melee"… Traducir alrededor de ellos, nunca dentro.
 * - Las etiquetas `<i>` y `<b>` se conservan, con su contenido traducido si es texto normal
 *   (`<b>Action</b>` → `<b>Acción</b>`) y sin traducir si es un subtipo de carta (`<i>vehicle</i>`
 *   → `<i>vehículo</i>` sí, pero un nombre propio no).
 * - Las **keywords** de regla se dejan en inglés: Guardian, Ambush, Redeploy. Son términos que el
 *   juego usa como identificador, no prosa.
 * - Los **nombres de carta** no se traducen (decisión del usuario, 2026-08-04): el buscador, los
 *   mazos de la comunidad y el import por "text file" usan los nombres ingleses.
 * - Glosario: character→personaje, upgrade→mejora, support→apoyo, event→evento, die/dice→dado/dados,
 *   roll→tirar, reroll→volver a tirar, resolve→resolver, remove→retirar, discard→descartar,
 *   defeat→derrotar, damage→daño, shield→escudo, resource→recurso, hand→mano, deck→mazo,
 *   opponent→rival, ready→enderezar, exhaust→agotar, "you may"→"puedes", unblockable→imbloqueable.
 */
export const CARD_TEXT_ES: Record<string, string> = {
  // --- Set 01: Awakenings ---
  '01001': 'Tus personajes no únicos tienen la keyword Guardian.',
  '01003':
    'Antes de que un personaje rival sea derrotado, puedes mover una de sus mejoras que no sean de <i>habilidad</i> a este personaje.',
  '01004': '<b>Acción</b> - Retira este dado para girar uno de tus dados de apoyo a la cara que quieras.',
  '01005': '[special] - Descarta un apoyo en juego.',
  '01006': '[special] - Retira todos los escudos de todos los personajes de un rival.',
  '01007':
    'Solo personaje Rojo. [special] - Elige un dado Rojo. Si es tuyo, resuélvelo aumentando su valor en 2. Si es de un rival, retíralo.',
  '01008':
    'Redeploy. [special] - Obliga a un rival a repartir 2 de daño entre sus personajes, como él quiera.',
  '01009':
    'Antes de que este personaje reciba 1 o más de daño, puedes descartar una carta de tu mano para darle 1 escudo.',
  '01010':
    'Después de activar este personaje, puedes obligar a un rival a elegir y descartar una carta de su mano.',
  '01011':
    '[special] - Elige un personaje rival. Después mira una carta al azar de la mano de ese rival e inflige a ese personaje daño igual al coste de la carta que acabas de mirar.',
  '01012': '<b>Acción</b> - Vuelve a tirar un dado. Inflige 1 de daño a este personaje.',
  '01013':
    'Solo personaje Azul. [special] - Inflige 1 de daño imbloqueable a otro personaje. Después puedes girar uno de sus dados de personaje o de mejora a la cara que quieras.',
  '01014':
    'Solo personaje Azul. <b>Acción</b> - Retira este dado para girar un dado a una cara en blanco ([blank]).',
  '01015':
    'Solo personaje Azul. [special] - Inflige 2 de daño a un personaje. Si algo de ese daño lo bloquean escudos, vuelve a tirar este dado en vez de retirarlo de tu pool.',
  '01016':
    '[special] - Intercambia esta mejora por una mejora Azul de <i>habilidad</i> de tu mano, ignorando sus restricciones de juego. Después puedes gastar 1 recurso para tirar su dado a tu pool, si puedes.',
  '01017': '[special] - Inflige 2 de daño a cada personaje de un rival. Descarta esta mejora del juego.',
  '01018': '[special] - Retira un dado. Puedes hacer una acción adicional.',
  '01019': 'Después de que un personaje rival sea derrotado, puedes enderezar a este personaje.',
  '01020': 'Después de activar este personaje, puedes volver a tirar un dado Amarillo.',
  '01022':
    'Después de activar este personaje, puedes descartar una carta de tu mano para resolver uno de sus dados de personaje o de mejora.',
  '01021': 'Después de que un rival active un personaje, puedes activar a este personaje.',
  '01023':
    'Solo personaje Amarillo. [special] - Gasta 5 recursos para elegir un personaje. Ese personaje es derrotado al terminar esta ronda.',
  '01024': '[special] - Inflige 1 de daño a cada uno de hasta 3 personajes distintos.',
  '01025':
    'Redeploy. [special] - Retira uno de tus dados que muestre daño cuerpo a cuerpo ([melee]) para infligir 3 de daño a un personaje.',
  '01026':
    '[special] - Retira todos los escudos de un personaje. Puedes gastar 1 recurso para retirar uno de sus dados de personaje o de mejora.',
  '01027':
    'Después de que un rival juegue o descarte la última carta de su mano, ese rival elige uno de sus personajes y le inflige 2 de daño.',
  '01028': '<b>Acción</b> - Retira este dado para volver a tirar hasta 2 de tus dados.',
  '01029':
    '[special] - Descarta una carta de tu mano para resolver una de las caras de su dado, si puedes. Después, si era una carta de <b>vehículo</b>, puedes pagar su coste para jugarla desde tu pila de descarte.',
  '01030': 'Guardian.',
  '01031': 'La X de este dado es igual al número de cartas de tu mano.',
  '01032':
    '[special] - Inflige 1 de daño a un personaje. Vuelve a tirar este dado en vez de retirarlo de tu pool.',
  '01033':
    '[special] - Mira la mano de un rival y descarta la carta más barata (tú eliges en caso de empate).',
  '01035': 'Después de activar este personaje, roba una carta.',
  '01036':
    'Mientras este personaje no tenga ninguna mejora, el coste de acoplarle un <i>arma</i> se reduce en 1.',
  '01037':
    'Antes de que este personaje gane 1 o más escudos, puedes retirarle 1 escudo para infligir 1 de daño a un personaje.',
  '01038': 'Después de jugar una mejora sobre este personaje, puedes hacer una acción adicional.',
  '01039': 'Solo personaje Azul. [special] - Reparte 3 escudos entre tus personajes como quieras.',
  '01040':
    'Después de jugar esta mejora, da 1 escudo al personaje al que va acoplada, o 2 escudos si es la primera ronda de la partida.',
  '01041':
    'Solo personaje Azul. [special] - Da 2 escudos a un personaje o inflige 2 de daño imbloqueable a un personaje.',
  '01042':
    'Solo personaje Azul. Antes de que el personaje al que va acoplada sea derrotado, esta mejora pasa a ser un apoyo durante el resto de la partida (entra enderezada).',
  '01043':
    '[special] - Vuelve a tirar este dado y otro dado tuyo. No retires este dado de tu pool después de resolver esta habilidad.',
  '01044': '[special] - Retira un dado que muestre daño ([melee] o [ranged])',
  '01045':
    'Puedes acoplar cualquier <i>arma</i> a este personaje, ignorando las restricciones de juego. Puedes incluir <i>armas</i> y <i>vehículos</i> Rojos de Villano en tu mazo.',
  '01046': 'Después de jugar una carta con la keyword Ambush, puedes dar 1 escudo a este personaje.',
  '01048':
    '[special] - Descarta la carta superior del mazo de un rival, o gasta 1 recurso para descartar las 2 cartas superiores del mazo de un rival.',
  '01049': '[special] - Juega gratis un evento Amarillo desde tu pila de descarte o desde tu mano.',
  '01050': 'Los escudos de este dado puedes repartirlos entre tus personajes como quieras.',
  '01051':
    'Ambush. Después de jugar esta mejora, obliga a un rival a elegir y retirar uno de sus dados.',
  '01052': '[special] - Vuelve a tirar hasta 2 dados de un rival.',
  '01053': '[special] - Resuelve la habilidad del campo de batalla como si acabaras de reclamarlo.',
  '01055': '[special] - Inflige 2 de daño imbloqueable a un personaje.',
  '01056': 'Solo personaje Rojo. Después de jugar esta mejora, puedes robar una carta.',
  '01057':
    'Solo personaje Azul. [special] - Retira un dado para infligir a un personaje daño igual al valor que muestra ese dado (los especiales y los blancos valen cero).',
  '01058':
    'Para jugarla, ten a la vista un personaje Azul. [special] - Elige y haz dos de estas cosas: inflige 1 de daño a un personaje, gana 1 recurso, o da 1 escudo a un personaje.',
  '01059': 'Redeploy. [special] - Inflige 2 de daño imbloqueable a un personaje.',
  '01060':
    'Solo personaje Azul. [special] - Inflige a un personaje rival 1 de daño por cada carta en la mano de ese rival.',
  '01061':
    'Después de jugar esta mejora, puedes volver a tirar cualquier número de dados tuyos o cualquier número de dados de un rival.',
  '01062': '[special] - Gira uno de tus dados a una cara que no muestre daño ([ranged] o [melee]).',
  '01063': 'Ambush. Redeploy.',
  '01064':
    '[special] - Roba 2 cartas. Puedes jugar una mejora de tu mano reduciendo su coste en 1.',
  '01065':
    'Solo personaje Amarillo. [special] - Resuelve una habilidad especial ([special]) de otra carta en juego como si fuera tu carta.',
  '01066':
    '[special] - Retira un dado que muestre daño cuerpo a cuerpo ([melee]) y da 1 escudo al personaje al que va acoplada.',
  '01067':
    'Para jugarla, ten a la vista un personaje Amarillo. [special] - Inflige 3 de daño a cada personaje de un rival. Descarta esta mejora del juego.',
  '01068':
    'Inflige a uno de tus personajes no únicos daño igual al valor de un dado rival que muestre daño ([melee] o [ranged]). Después retira ese dado.',
  '01069':
    'Obliga a un rival a elegir y retirar uno de sus dados. Puedes poner este evento en el fondo de tu mazo en vez de descartarlo.',
  '01070':
    'Devuelve al juego uno de tus personajes Rojos no únicos derrotados, sin daño encima.',
  '01071':
    'Juega esta carta solo si controlas el campo de batalla. Obliga a un rival a perder todos sus recursos.',
  '01072':
    'Mira dos cartas al azar de la mano de tu rival y descarta las que sean eventos.',
  '01073':
    'Cuenta cuántos personajes Rojos enderezados tienes. Vuelve a tirar esa cantidad de dados de un rival.',
  '01074': 'Ten a la vista un personaje Rojo para hacer hasta 2 acciones adicionales.',
  '01075':
    'Inflige 3 de daño a uno de tus personajes Rojos para retirar hasta 2 dados de un rival.',
  '01076': '<b>Acción</b> - Agota este apoyo y uno de tus personajes para ganar 1 recurso.',
  '01077':
    'Cada rival gana 1 recurso menos durante cada fase de mantenimiento, hasta un mínimo de 1.',
  '01078': 'El personaje al que va acoplada tiene la keyword Guardian.',
  '01079':
    'Obliga a un rival a elegir entre perder todos sus recursos o descartar todas las cartas de su mano.',
  '01080': 'Roba cartas hasta tu tamaño de mano.',
  '01081': 'Inflige 1 de daño a uno de tus personajes Azules para ganar 1 recurso.',
  '01082':
    'Cuenta cuántos blancos ([blank]) muestran los dados de un rival. Retira esa cantidad de sus dados.',
  '01083':
    'Gira uno de tus dados Azules a la cara que muestre daño cuerpo a cuerpo ([melee]). Después puedes resolver ese dado.',
  '01084': 'Retira todos los escudos de un personaje.',
  '01085': 'Ten a la vista un personaje Azul para retirar un dado de personaje.',
  '01086':
    'Descarta tantas cartas Azules de tu mano como quieras. Después resuelve uno de tus dados que muestre daño ([melee] o [ranged]), aumentando su valor en 1 por cada carta que acabas de descartar.',
  '01087':
    'Mira las 3 cartas superiores de cualquier mazo. Después colócalas encima y/o debajo de ese mazo en el orden que quieras.',
  '01088': 'Tu tamaño de mano aumenta en 1.',
  '01089':
    '<b>Acción</b> - Agota este apoyo para volver a tirar uno de tus dados. Si ese dado saca un blanco ([blank]), inflige 2 de daño imbloqueable a un personaje.',
  '01090':
    '<b>Acción</b> - Si el personaje al que va acoplada no tiene escudos, agota esta mejora para darle 1 escudo.',
  '01091': 'Gira a la cara que quieras cada uno de tus dados que muestre un blanco ([blank]).',
  '01092':
    'Descarta una mejora Amarilla de tu mano para tirar su dado a tu pool, si puedes. Aparta ese dado después de resolverlo o retirarlo.',
  '01093':
    'Descarta tantas mejoras como quieras de uno de tus personajes Amarillos. Después inflige a un personaje daño igual al número de mejoras que acabas de descartar.',
  '01094':
    'Gasta recursos igual al coste de una mejora rival en juego para devolver esa mejora a su mano.',
  '01095':
    'Retira tantos dados Amarillos tuyos como quieras. Después inflige a un personaje daño igual al número de dados que acabas de retirar.',
  '01096':
    'Resuelve uno de tus dados que muestre daño a distancia ([ranged]), tratando ese daño como imbloqueable.',
  '01097': 'Retira uno de tus dados para retirar un dado de un rival.',
  '01098':
    'Obliga a un rival a elegir y descartar cartas de su mano hasta quedarse con tantas como tengas tú en la tuya.',
  '01099':
    'Al jugar este apoyo, pon 3 de daño encima. <b>Acción</b> - Agota este apoyo para mover 1 de daño de aquí a un personaje <em>(esto ignora los escudos)</em>.',
  '01100':
    'Después de resolver un dado que muestre disrupt ([disrupt]), puedes agotar este apoyo para ganar tantos recursos como acabe de perder tu rival.',
  '01101': '<b>Acción</b> - Agota este apoyo para ganar 1 recurso.',
  '01102':
    'Después de jugar esta mejora, puedes retirar un dado de personaje de un rival y colocarlo aquí. Ningún personaje lo tira y no vuelve con su personaje salvo que esta mejora salga del juego.',
  '01103':
    'Resuelve uno de tus dados Rojos que muestre descarte ([discard]), aumentando su valor en 2. Después roba una carta.',
  '01104':
    'Juega esta carta solo si controlas el campo de batalla. Retira todos los dados de un rival que muestren un valor de 2 o más.',
  '01105': 'Retira 2 de daño de un personaje.',
  '01106': 'Ambush. Activa uno de tus personajes Rojos.',
  '01107':
    'Elige un símbolo que muestre un dado de un rival. Después gira hasta 2 de tus dados Rojos a caras que muestren ese símbolo.',
  '01108': 'Resuelve uno de tus dados aumentando su valor en 1.',
  '01109': 'Juega una mejora Roja desde tu pila de descarte reduciendo su coste en 1.',
  '01110': 'Tu rival puede hacer 1 acción. Después termina la fase de acción.',
  '01111': 'Endereza un apoyo que no tenga mods, o agota un apoyo.',
  '01112':
    'Retira tantos dados Rojos tuyos que muestren daño a distancia ([ranged]) como quieras, aumentando el valor de cada uno en 1, para descartar del juego un apoyo cuyo coste sea igual o menor que el valor combinado de esos dados.',
  '01113':
    '<b>Acción</b> - Agota este apoyo y descarta una carta de tu mano para dar 1 escudo a un personaje. Después endereza este apoyo, salvo que un rival gaste 1 recurso.',
  '01114':
    'Obliga a un rival a elegir y resolver tantos de sus dados como quiera, en el orden que quiera. Después retira todos los dados suyos que no haya resuelto.',
  '01115': 'Da 2 escudos a un personaje.',
  '01116':
    'Elige un símbolo que muestre uno de tus dados Azules. Después retira todos los dados de un rival que muestren ese símbolo.',
  '01117':
    'Inflige a uno de tus personajes únicos daño igual al valor de un dado rival que muestre daño ([ranged] o [melee]). Después retira ese dado.',
  '01118': 'Derrota a uno de tus personajes Azules para agotar a un personaje.',
  '01119':
    'Retira tantos dados tuyos como quieras. Después descarta de la parte superior del mazo de un rival tantas cartas como dados hayas retirado.',
  '01120': 'Añade a tu mano un evento Azul de tu pila de descarte.',
  '01121':
    'Retira tantos escudos como quieras de uno de tus personajes. Después inflige a un personaje daño igual al número de escudos que acabas de retirar.',
  '01122':
    'Mueve 1 de daño de uno de tus personajes agotados a un personaje agotado de un rival (esto ignora los escudos).',
  '01123':
    '<b>Acción</b> - Agota este apoyo para mirar las 2 cartas superiores del mazo de un jugador. Después puedes descartar una de ellas y hacer que ese jugador robe la otra.',
  '01124':
    '<b>Acción</b> - Agota este apoyo para resolver uno de tus dados que muestre una cara modificada <em>(una cara con +)</em> como si no estuviera modificada <em>(como si no tuviera el +)</em>.',
  '01125':
    '<b>Acción</b> - Agota este apoyo y descarta una carta Azul de tu mano para jugar gratis otra copia de esa carta desde tu mano.',
  '01126':
    'Ambush. Vuelve a tirar tantos dados de un rival como quieras. Después retira todos sus dados que muestren blancos ([blank]).',
  '01127': 'Cada jugador roba 2 cartas.',
  '01128':
    'Mueve hasta 2 de daño de uno de tus personajes a otro personaje tuyo (esto ignora los escudos).',
  '01129':
    'Termina la fase de acción. Puedes cambiar el campo de batalla por el que no se está usando. Aparta esta carta en vez de descartarla.',
  '01130':
    'Obliga a un rival a elegir entre infligir 2 de daño a uno de sus personajes agotados, o elegir y retirar 2 de sus dados.',
  '01131':
    'Retira uno de tus dados de personaje para obligar a un rival a elegir y retirar 2 de sus dados.',
  '01132':
    'Descarta las 3 cartas superiores de tu mazo. Después puedes añadir a tu mano una mejora o un apoyo de tu pila de descarte.',
  '01133':
    'Ambush. Resuelve uno de tus dados Amarillos que muestre daño a distancia ([ranged]). Después retira un dado de un rival que muestre daño a distancia ([ranged]).',
  '01134':
    'Ten a la vista un personaje Amarillo y descarta una carta de tu mano para ganar 1 recurso.',
  '01135':
    '<b>Acción</b> - Agota este apoyo para volver a tirar uno de tus dados Amarillos. Si saca un recurso ([resource]), gana 1 recurso.',
  '01136': 'Ambush. <b>Acción</b> - Agota este apoyo para mirar la mano de un rival.',
  '01137':
    'Solo personaje Amarillo. Antes de que el personaje al que va acoplada sea derrotado, cúrale 5 de daño y descarta esta mejora del juego.',
  '01138':
    'Ten a la vista un personaje Rojo para robar tantas cartas como personajes agotados tengas. Aparta esa misma cantidad de cartas de tu mano.',
  '01139':
    'Juega esta carta solo si controlas el campo de batalla. Reparte 3 escudos entre tus personajes como quieras.',
  '01140':
    'Resuelve uno de tus dados Rojos que muestre daño a distancia ([ranged]), aumentando su valor en 1, o en 2 si estás resolviendo un dado de <i>vehículo</i>.',
  '01141': 'Agota a uno de tus personajes Rojos únicos para enderezar a otro personaje.',
  '01142':
    'Ten a la vista un personaje Rojo para resolver un dado con el símbolo de recurso ([resource]), aumentando su valor en 1.',
  '01143': 'Activa a la vez tantos personajes no únicos tuyos como quieras.',
  '01144':
    '<b>Acción</b> - Agota este apoyo para resolver uno de tus dados que muestre daño a distancia ([ranged]), aumentando su valor en 1.',
  '01145':
    'Ten a la vista un personaje Azul para retirar un dado que muestre daño a distancia ([ranged]) e infligir la mitad de ese daño, redondeando hacia arriba, a un personaje.',
  '01146': 'Vuelve a tirar todos los dados.',
  '01147':
    'Ten a la vista un personaje Azul para obligar a tu rival a dividir su pool de dados en 2 grupos del tamaño que quiera. Elige 1 grupo y retira todos sus dados.',
  '01148':
    'Resuelve uno de tus dados tratando su valor como igual al número de mejoras Azules que tengas en juego.',
  '01149': 'Ten a la vista un personaje Azul para girar un dado a la cara que quieras.',
  '01150':
    'Antes de jugar una mejora Azul, puedes agotar este apoyo para reducir su coste en 1.',
  '01151': 'Gira uno de tus dados a una cara que muestre daño a distancia ([ranged]).',
  '01152': 'Resuelve tantos dados tuyos como quieras, en el orden que quieras.',
  '01153': 'Retira todos los dados de un rival que muestren daño cuerpo a cuerpo.',
  '01154':
    'Cuenta cuántos dados tuyos muestran daño cuerpo a cuerpo ([melee]). Descarta esa cantidad de cartas al azar de la mano de un rival.',
  '01155': 'Retira todos los dados de un rival que muestren daño a distancia ([ranged])',
  '01156':
    'Juega esta carta solo si tienes más personajes enderezados que un rival. Retira uno de los dados de ese rival.',
  '01157': 'Da 1 escudo a un personaje.',
  '01158':
    'Retira uno de tus dados que muestre daño ([melee] o [ranged]) para descartar del juego un <i>arma</i> o un <i>equipo</i> cuyo coste sea igual o menor que el valor de ese dado.',
  '01159':
    'Ten a la vista un personaje Amarillo para retirar un dado que muestre un valor de 2 o menos.',
  '01160':
    'Ten a la vista un personaje Amarillo para retirar un dado que muestre daño ([melee] o [ranged]) e infligir ese daño a un personaje.',
  '01161': 'Ten a la vista un personaje Amarillo para volver a tirar todos los dados de un rival.',
  '01162': 'Ambush. Vuelve a tirar un dado (tuyo o de un rival).',
  '01163':
    'Antes de jugar una carta Amarilla, puedes agotar este apoyo para darle la keyword Ambush.',
  '01164':
    'Si el personaje al que va acoplada recibe daño cuerpo a cuerpo ([melee]), descarta esta mejora. <b>Acción</b> - Agota esta mejora para darle 1 escudo al personaje al que va acoplada.',
  '01165': '<b>Reclamar</b> - Cada rival descarta las 2 cartas superiores de su mazo.',
  '01166': '<b>Reclamar</b> - Da 1 escudo a un personaje.',
  '01167':
    '<b>Reclamar</b> - Gira uno de tus dados a una cara que muestre una habilidad especial ([special]). Después puedes resolver ese dado.',
  '01168': '<b>Reclamar</b> - Retira un dado de personaje.',
  '01169': '<b>Reclamar</b> - Juega una mejora de tu mano reduciendo su coste en 1.',
  '01170':
    '<b>Reclamar</b> - Mira la mano de un rival y descarta de ella hasta 2 eventos que elijas.',
  '01171':
    '<b>Reclamar</b> - Resuelve uno de tus dados. Si tiene coste de recursos, no tienes que pagarlo.',
  '01172':
    '<b>Reclamar</b> - Devuelve a tu mano una de tus mejoras en juego para ganar 1 recurso.',
  '01173':
    '<b>Reclamar</b> - Cada rival elige uno de sus personajes y le inflige 1 de daño imbloqueable.',
  '01174':
    '<b>Reclamar</b> - Elige un apoyo o una mejora de tu pila de descarte y ponla encima de tu mazo.',
};
