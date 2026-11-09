// Výchozí sada receptů pro novou domácnost (suroviny pro 2 porce).
const r = (id, name, emoji, type, preparation, ingredients, instructions) => ({
  id,
  name,
  image: null,
  emoji,
  ingredients: ingredients.map(([n, a]) => ({ name: n, amount: a })),
  instructions,
  type,
  preparation,
});

const MealsList = [
  // ===== SNÍDANĚ =====
  r(1, 'Avokádový toust', '🥑', 'breakfast', 'Bez vaření', [
    ['Chléb celozrnný', '4 plátky'], ['Avokádo', '1 ks'], ['Citron', '½ ks'], ['Cherry rajčata', '6 ks'], ['Sůl, pepř', 'dle chuti'],
  ], 'Chleba opečeme v toustovači. Avokádo rozmačkáme s citronovou šťávou, solí a pepřem, namažeme na toust a doplníme půlkami rajčat.'),
  r(2, 'Smažená vajíčka se šunkou v tortille', '🌯', 'breakfast', 'Smažení', [
    ['Tortilla pšeničná', '2 ks'], ['Vejce', '4 ks'], ['Šunka', '4 plátky'], ['Eidam plátkový', '2 plátky'], ['Olej', '1 lžíce'],
  ], 'Na pánvi usmažíme vajíčka a šunku. Tortillu krátce ohřejeme, vložíme sýr, šunku a vajíčka a pevně zabalíme.'),
  r(3, 'Jogurt s borůvkami / banánem', '🥛', 'breakfast', 'Bez vaření', [
    ['Řecký jogurt', '300 g'], ['Borůvky', '100 g'], ['Banán', '1 ks'], ['Med', '2 lžičky'], ['Ovesné vločky', '4 lžíce'],
  ], 'Jogurt rozdělíme do misek, přidáme borůvky nebo nakrájený banán, vločky a pokapeme medem.'),
  r(4, 'Croissant se šunkou, sýrem a salátem', '🥐', 'breakfast', 'Bez vaření', [
    ['Croissant', '2 ks'], ['Šunka', '4 plátky'], ['Eidam plátkový', '2 plátky'], ['Salát ledový', '4 listy'], ['Rajčata', '1 ks'],
  ], 'Croissanty podélně rozkrojíme, případně krátce ohřejeme. Naplníme šunkou, sýrem, salátem a plátky rajčete.'),
  r(5, 'Proteinové slané palačinky', '🥞', 'breakfast', 'Smažení', [
    ['Vejce', '3 ks'], ['Ovesné vločky', '60 g'], ['Cottage cheese', '150 g'], ['Šunka', '4 plátky'], ['Pažitka', '1 hrst'],
  ], 'Vejce, vločky a cottage rozmixujeme na hladké těsto. Pečeme na pánvi z obou stran a plníme šunkou a pažitkou.'),
  r(6, 'Snídaně od Páji', '🍽️', 'breakfast', '', [], 'Recept doplňte (poslala Pája).'),
  r(7, 'Omeleta', '🍳', 'breakfast', 'Smažení', [
    ['Vejce', '4 ks'], ['Eidam plátkový', '2 plátky'], ['Paprika', '½ ks'], ['Šunka', '2 plátky'], ['Máslo', '1 lžička'],
  ], 'Vejce rozšleháme se solí. Na másle nalijeme na pánev, přidáme nakrájenou papriku, šunku a sýr a přeložíme.'),

  // ===== OBĚDY =====
  r(8, 'Steak a zelenina', '🥩', 'lunch', 'Smažení', [
    ['Hovězí steak', '2 ks'], ['Brokolice', '300 g'], ['Cuketa', '1 ks'], ['Olivový olej', '1 lžíce'], ['Máslo', '1 lžíce'],
  ], 'Steaky osolíme a opečeme na rozpálené pánvi na másle do požadované propečenosti. Zeleninu orestujeme na oleji a podáváme spolu.'),
  r(9, 'Brokolice, nudle a hovězí', '🥦', 'lunch', 'Smažení', [
    ['Hovězí maso na stroganov', '300 g'], ['Brokolice', '300 g'], ['Vaječné nudle', '200 g'], ['Sójová omáčka', '3 lžíce'], ['Česnek', '2 stroužky'],
  ], 'Nudle uvaříme. Maso prudce osmahneme, přidáme brokolici a česnek a podusíme. Smícháme s nudlemi a dochutíme sójovou omáčkou.'),
  r(10, 'Květákový steak s hummusem', '🥦', 'lunch', 'Pečení', [
    ['Květák', '1 ks'], ['Hummus', '150 g'], ['Olivový olej', '2 lžíce'], ['Paprika uzená mletá', '1 lžička'], ['Petržel', '1 hrst'],
  ], 'Květák nakrájíme na silné plátky, potřeme olejem a paprikou. Pečeme při 200 °C asi 25 minut, podáváme s hummusem a petrželkou.'),
  r(11, 'Kuřecí křídla / paličky s přílohou', '🍗', 'lunch', 'Pečení', [
    ['Kuřecí paličky', '600 g'], ['Brambory', '500 g'], ['Paprika sladká mletá', '2 lžičky'], ['Česnek', '2 stroužky'], ['Olej', '2 lžíce'],
  ], 'Maso okořeníme paprikou, česnekem a olejem. Spolu s brambory pečeme při 200 °C asi 45 minut dozlatova.'),
  r(12, 'Kuře s rýží', '🍚', 'lunch', 'Vaření', [
    ['Kuřecí prsa', '300 g'], ['Rýže jasmínová', '150 g'], ['Mrkev', '1 ks'], ['Hrášek mražený', '100 g'], ['Olej', '1 lžíce'],
  ], 'Rýži uvaříme. Kuřecí maso nakrájené na kostky orestujeme s mrkví, přidáme hrášek a podusíme. Podáváme s rýží.'),
  r(13, 'Teriyaki (kuřecí teriyaki s rýží)', '🍱', 'lunch', 'Smažení', [
    ['Kuřecí stehenní řízky', '350 g'], ['Rýže jasmínová', '150 g'], ['Teriyaki omáčka', '4 lžíce'], ['Brokolice', '200 g'], ['Sezamová semínka', '1 lžička'],
  ], 'Rýži uvaříme. Maso nakrájené na proužky osmahneme, přidáme brokolici a zalijeme teriyaki omáčkou. Podáváme na rýži se sezamem.'),
  r(14, 'Zapečená brokolice s masem', '🥦', 'lunch', 'Pečení', [
    ['Brokolice', '400 g'], ['Mleté maso mix', '300 g'], ['Smetana na vaření', '150 ml'], ['Eidam strouhaný', '100 g'], ['Cibule', '1 ks'],
  ], 'Brokolici krátce povaříme. Mleté maso orestujeme s cibulí, smícháme s brokolicí, zalijeme smetanou a posypeme sýrem. Zapečeme při 190 °C asi 20 minut.'),
  r(15, 'Kuřecí wrap se salátem', '🌯', 'lunch', 'Smažení', [
    ['Tortilla pšeničná', '2 ks'], ['Kuřecí prsa', '250 g'], ['Salát ledový', '4 listy'], ['Rajčata', '1 ks'], ['Jogurtový dresink', '3 lžíce'],
  ], 'Kuřecí prsa nakrájená na proužky osmažíme. Tortilly potřeme dresinkem, naplníme masem, salátem a rajčetem a zabalíme.'),
  r(16, 'Fajitas', '🌮', 'lunch', 'Smažení', [
    ['Kuřecí prsa', '300 g'], ['Tortilla pšeničná', '4 ks'], ['Paprika', '2 ks'], ['Cibule', '1 ks'], ['Směs na fajitas', '1 sáček'], ['Zakysaná smetana', '100 g'],
  ], 'Maso, papriku a cibuli nakrájíme na proužky a osmahneme s kořenicí směsí. Plníme do ohřátých tortill se zakysanou smetanou.'),
  r(17, 'Chilli con carne', '🌶️', 'lunch', 'Vaření', [
    ['Mleté hovězí maso', '300 g'], ['Fazole červené v nálevu', '1 plechovka'], ['Kukuřice', '100 g'], ['Rajčata drcená', '400 g'], ['Cibule', '1 ks'], ['Chilli koření', '1 lžička'],
  ], 'Cibuli a maso zprudka osmahneme, přidáme rajčata, koření, fazole a kukuřici. Za občasného míchání vaříme asi 30 minut. Podáváme s rýží nebo chlebem.'),
  r(18, 'Burrito', '🌯', 'lunch', 'Smažení', [
    ['Tortilla pšeničná', '2 velké'], ['Mleté hovězí maso', '250 g'], ['Rýže', '100 g'], ['Fazole červené v nálevu', '½ plechovky'], ['Eidam strouhaný', '50 g'], ['Salsa omáčka', '3 lžíce'],
  ], 'Rýži uvaříme, maso osmahneme se salsou a fazolemi. Na tortillu dáme rýži, náplň a sýr, zabalíme a z obou stran opečeme na pánvi.'),
  r(19, 'Těstovinový salát', '🥗', 'lunch', 'Vaření', [
    ['Těstoviny fusilli', '200 g'], ['Kuřecí šunka', '100 g'], ['Kukuřice', '100 g'], ['Okurka', '1 ks'], ['Cherry rajčata', '8 ks'], ['Majonéza', '2 lžíce'],
  ], 'Těstoviny uvaříme a necháme vychladnout. Smícháme s nakrájenou zeleninou, šunkou, kukuřicí a majonézou a dochutíme.'),
  r(20, 'Losos (s bramborem/zeleninou)', '🐟', 'lunch', 'Pečení', [
    ['Filet z lososa', '2 ks'], ['Brambory', '400 g'], ['Brokolice', '250 g'], ['Citron', '½ ks'], ['Olivový olej', '1 lžíce'],
  ], 'Brambory a brokolici pokapeme olejem a pečeme při 200 °C 15 minut. Přidáme lososa s citronem a pečeme dalších 12–15 minut.'),

  // ===== VEČEŘE =====
  r(21, 'Polévka od Páji', '🍲', 'dinner', '', [], 'Recept doplňte (polévky od Páji).'),
  r(22, 'Pomazánka s pečivem (vajíčková)', '🥚', 'dinner', 'Bez vaření', [
    ['Vejce', '4 ks'], ['Majonéza', '2 lžíce'], ['Pažitka', '1 hrst'], ['Pečivo', '4 ks'], ['Ředkvičky', '1 svazek'],
  ], 'Vejce uvaříme natvrdo, nastrouháme nebo nasekáme a smícháme s majonézou, pažitkou, solí a pepřem. Podáváme s pečivem a ředkvičkami.'),
  r(23, 'Tapas / obložený talíř', '🧀', 'dinner', 'Bez vaření', [
    ['Šunka', '100 g'], ['Salám', '80 g'], ['Sýr', '120 g'], ['Olivy', '80 g'], ['Cherry rajčata', '6 ks'], ['Bageta', '1 ks'],
  ], 'Na prkénko naaranžujeme nakrájené uzeniny, sýry, olivy a zeleninu. Podáváme s bagetou.'),
];

export default MealsList;
