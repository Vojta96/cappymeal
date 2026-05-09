const MealsList = [
  // ===== SNÍDANĚ =====
  {
    id: 1,
    name: "Palačinky z banánů a bílků",
    image: null,
    emoji: "🥞",
    ingredients: [
      { name: "Vaječné bílky", amount: "3 ks" },
      { name: "Banán", amount: "½ ks" },
      { name: "Ořechové máslo", amount: "1 lžíce" },
      { name: "Skořice", amount: "špetka" },
    ],
    instructions: "Rozmixujeme všechny ingredience a upečeme na teflonové pánvi.",
    type: "breakfast",
    preparation: "Smažení",
  },
  {
    id: 2,
    name: "Ovesná kaše s jablkem a skořicí",
    image: null,
    emoji: "🍚",
    ingredients: [
      { name: "Ovesné vločky", amount: "80 g" },
      { name: "Mléko", amount: "200 ml" },
      { name: "Jablko", amount: "1 ks" },
      { name: "Skořice", amount: "1 lžičky" },
      { name: "Med", amount: "1 lžičky" },
    ],
    instructions: "Vločky uvaříme v mléce, přidáme nastrouhané jablko a skořici, přesladíme medem.",
    type: "breakfast",
    preparation: "Vaření",
  },
  {
    id: 3,
    name: "Míchaná vejce se zeleninou",
    image: null,
    emoji: "🍳",
    ingredients: [
      { name: "Vejce", amount: "3 ks" },
      { name: "Paprika", amount: "½ ks" },
      { name: "Rajče", amount: "1 ks" },
      { name: "Čerstvý špenát", amount: "hrst" },
      { name: "Olivový olej", amount: "1 lžičky" },
      { name: "Sůl, pepř", amount: "dle chuti" },
    ],
    instructions: "Na oleji osmažíme zeleninu, přidáme rozšlehaná vejce a mícháme do tuhé.",
    type: "breakfast",
    preparation: "Smažení",
  },
  {
    id: 4,
    name: "Jogurt parfait s granolou",
    image: null,
    emoji: "🥛",
    ingredients: [
      { name: "Řecký jogurt", amount: "200 g" },
      { name: "Granola", amount: "50 g" },
      { name: "Lesní ovoce", amount: "hrst" },
      { name: "Med", amount: "1 lžičky" },
    ],
    instructions: "Vrstvíme jogurt, granolu a ovoce, pokapeme medem.",
    type: "breakfast",
    preparation: "Bez vaření",
  },
  {
    id: 5,
    name: "Toast s avokádem a vejcem",
    image: null,
    emoji: "🥑",
    ingredients: [
      { name: "Celozrnný chléb", amount: "2 plátky" },
      { name: "Avokádo", amount: "½ ks" },
      { name: "Vejce", amount: "1 ks" },
      { name: "Citronová šťáva", amount: "pár kapek" },
      { name: "Sůl, pepř", amount: "dle chuti" },
      { name: "Chilli vločky", amount: "dle chuti" },
    ],
    instructions: "Chleba opečeme, rozmačkáme avokádo s citronem a solí, navrch položíme volské oko.",
    type: "breakfast",
    preparation: "Smažení",
  },

  // ===== SVAČINA =====
  {
    id: 6,
    name: "Jablko s mandlovým máslem",
    image: null,
    emoji: "🍎",
    ingredients: [
      { name: "Jablko", amount: "1 ks" },
      { name: "Mandlové máslo", amount: "2 lžíce" },
    ],
    instructions: "Jablko nakrájíme na plátky, podáváme s mandlovým máslem.",
    type: "snack",
    preparation: "Bez vaření",
  },
  {
    id: 7,
    name: "Tvaroh s ovocem",
    image: null,
    emoji: "🍓",
    ingredients: [
      { name: "Tvaroh", amount: "150 g" },
      { name: "Jahody nebo borůvky", amount: "hrst" },
      { name: "Med", amount: "1 lžičky" },
    ],
    instructions: "Smícháme tvaroh s ovocem, přesladíme medem.",
    type: "snack",
    preparation: "Bez vaření",
  },
  {
    id: 8,
    name: "Ořechy a sušené ovoce",
    image: null,
    emoji: "🥜",
    ingredients: [
      { name: "Vlašské ořechy", amount: "30 g" },
      { name: "Mandle", amount: "20 g" },
      { name: "Sušené meruňky", amount: "30 g" },
    ],
    instructions: "Smícháme a pojídáme jako rychlou svačinu.",
    type: "snack",
    preparation: "Bez vaření",
  },
  {
    id: 9,
    name: "Rýžový chlebíček s cottage sýrem",
    image: null,
    emoji: "🍞",
    ingredients: [
      { name: "Rýžové chlebíčky", amount: "3 ks" },
      { name: "Cottage sýr", amount: "100 g" },
      { name: "Pažitka", amount: "hrst" },
      { name: "Rajče", amount: "½ ks" },
    ],
    instructions: "Chlebíčky pomažeme cottage sýrem, posypeme pažitkou a přidáme nakrájené rajče.",
    type: "snack",
    preparation: "Bez vaření",
  },

  // ===== OBĚD =====
  {
    id: 10,
    name: "Zeleninová polévka s kuřecím masem",
    image: null,
    emoji: "🍲",
    ingredients: [
      { name: "Kuřecí prsa", amount: "150 g" },
      { name: "Celer", amount: "kus" },
      { name: "Petržel", amount: "2 ks" },
      { name: "Mrkev", amount: "2 ks" },
      { name: "Cibule", amount: "1 ks" },
      { name: "Česnek", amount: "2 stroužky" },
      { name: "Sůl, pepř", amount: "dle chuti" },
    ],
    instructions: "Maso uvaříme v osolené vodě s cibulí a česnekem. Před koncem nastrouhejte kořenovou zeleninu. Posypeme petrželí.",
    type: "lunch",
    preparation: "Vaření",
  },
  {
    id: 11,
    name: "Kuřecí steak s rýží a brokolicí",
    image: null,
    emoji: "🍗",
    ingredients: [
      { name: "Kuřecí prsa", amount: "200 g" },
      { name: "Rýže", amount: "80 g" },
      { name: "Brokolice", amount: "200 g" },
      { name: "Olivový olej", amount: "1 lžíce" },
      { name: "Sůl, pepř, paprika", amount: "dle chuti" },
    ],
    instructions: "Rýži uvaříme. Kuřecí prsa okořeníme a opečeme na oleji. Brokolici uvaříme nebo podusíme.",
    type: "lunch",
    preparation: "Vaření + Smažení",
  },
  {
    id: 12,
    name: "Těstoviny Bolognese",
    image: null,
    emoji: "🍝",
    ingredients: [
      { name: "Špagety", amount: "100 g" },
      { name: "Mleté hovězí maso", amount: "150 g" },
      { name: "Rajčatová passata", amount: "200 ml" },
      { name: "Cibule", amount: "1 ks" },
      { name: "Česnek", amount: "2 stroužky" },
      { name: "Olivový olej", amount: "1 lžíce" },
      { name: "Bazalka, oregano", amount: "dle chuti" },
    ],
    instructions: "Osmažíme cibuli a česnek, přidáme maso a opečeme. Přilijeme passatu, dusíme 15 min. Podáváme s uvařenými těstovinami.",
    type: "lunch",
    preparation: "Vaření + Smažení",
  },
  {
    id: 13,
    name: "Losos se zeleninou a brambory",
    image: null,
    emoji: "🐟",
    ingredients: [
      { name: "Losos (filé)", amount: "180 g" },
      { name: "Brambory", amount: "200 g" },
      { name: "Cuketa", amount: "1 ks" },
      { name: "Citron", amount: "½ ks" },
      { name: "Olivový olej", amount: "1 lžíce" },
      { name: "Sůl, pepř, kopr", amount: "dle chuti" },
    ],
    instructions: "Brambory uvaříme. Lososa a cuket upečeme v troubě při 180 °C po dobu 20 minut. Podáváme s citronem.",
    type: "lunch",
    preparation: "Pečení",
  },
  {
    id: 14,
    name: "Čočková polévka",
    image: null,
    emoji: "🍛",
    ingredients: [
      { name: "Červená čočka", amount: "150 g" },
      { name: "Mrkev", amount: "2 ks" },
      { name: "Cibule", amount: "1 ks" },
      { name: "Česnek", amount: "2 stroužky" },
      { name: "Kmín, kurkuma", amount: "1 lžičky" },
      { name: "Olivový olej", amount: "1 lžíce" },
      { name: "Sůl", amount: "dle chuti" },
    ],
    instructions: "Osmažíme cibuli a česnek, přidáme koření, čočku a zeleninu. Zalijeme vodou a vaříme 20 min.",
    type: "lunch",
    preparation: "Vaření",
  },
  {
    id: 15,
    name: "Kuřecí Caesar salát",
    image: null,
    emoji: "🥗",
    ingredients: [
      { name: "Kuřecí prsa", amount: "150 g" },
      { name: "Římský salát", amount: "200 g" },
      { name: "Parmazán", amount: "30 g" },
      { name: "Krutony", amount: "hrst" },
      { name: "Caesar dresink", amount: "3 lžíce" },
    ],
    instructions: "Kuře opečeme a nakrájíme. Smícháme se salátem, parmazánem a krutonami. Polijeme dresinkem.",
    type: "lunch",
    preparation: "Smažení",
  },

  // ===== ODPOLEDNÍ SVAČINA =====
  {
    id: 16,
    name: "Tvarohový dip se zeleninou",
    image: null,
    emoji: "🥦",
    ingredients: [
      { name: "Tvaroh", amount: "150 g" },
      { name: "Mrkev", amount: "2 ks" },
      { name: "Okurka", amount: "½ ks" },
      { name: "Paprika", amount: "½ ks" },
      { name: "Pažitka, sůl, pepř", amount: "dle chuti" },
    ],
    instructions: "Tvaroh okořeníme pažitkou, solí a pepřem. Podáváme s nakrájenou zeleninou.",
    type: "afternoon_snack",
    preparation: "Bez vaření",
  },
  {
    id: 17,
    name: "Ovocný salát",
    image: null,
    emoji: "🍉",
    ingredients: [
      { name: "Jahody", amount: "100 g" },
      { name: "Borůvky", amount: "80 g" },
      { name: "Banán", amount: "1 ks" },
      { name: "Kiwi", amount: "1 ks" },
      { name: "Citronová šťáva", amount: "pár kapek" },
    ],
    instructions: "Nakrájíme ovoce a smícháme, pokapeme citronovou šťávou.",
    type: "afternoon_snack",
    preparation: "Bez vaření",
  },
  {
    id: 18,
    name: "Proteinový shake s banánem",
    image: null,
    emoji: "🥤",
    ingredients: [
      { name: "Proteinový prášek", amount: "30 g" },
      { name: "Banán", amount: "1 ks" },
      { name: "Mléko nebo mandlové mléko", amount: "250 ml" },
    ],
    instructions: "Vše rozmixujeme v mixéru dohladka.",
    type: "afternoon_snack",
    preparation: "Bez vaření",
  },

  // ===== VEČEŘE =====
  {
    id: 19,
    name: "Kuřecí prsa s bylinkami a špenátem",
    image: null,
    emoji: "🍗",
    ingredients: [
      { name: "Kuřecí prsa", amount: "200 g" },
      { name: "Čerstvý špenát", amount: "150 g" },
      { name: "Česnek", amount: "2 stroužky" },
      { name: "Olivový olej", amount: "1 lžíce" },
      { name: "Tymián, rozmarýn", amount: "dle chuti" },
      { name: "Sůl, pepř", amount: "dle chuti" },
    ],
    instructions: "Kuřecí prsa okořeníme bylinkami a opečeme na oleji. Na stejné pánvi osmažíme česnek a přidáme špenát.",
    type: "dinner",
    preparation: "Smažení",
  },
  {
    id: 20,
    name: "Vepřová panenka s pečenou zeleninou",
    image: null,
    emoji: "🥩",
    ingredients: [
      { name: "Vepřová panenka", amount: "200 g" },
      { name: "Batáty", amount: "200 g" },
      { name: "Cuketa", amount: "1 ks" },
      { name: "Červená paprika", amount: "1 ks" },
      { name: "Olivový olej", amount: "2 lžíce" },
      { name: "Sůl, pepř, oregano", amount: "dle chuti" },
    ],
    instructions: "Zeleninu nakrájíme, polijeme olejem, okořeníme a pečeme 25 min při 200 °C. Maso opečeme na pánvi.",
    type: "dinner",
    preparation: "Pečení + Smažení",
  },
  {
    id: 21,
    name: "Pečené rybí filé s citronem",
    image: null,
    emoji: "🐟",
    ingredients: [
      { name: "Bílé rybí filé (treska)", amount: "200 g" },
      { name: "Citron", amount: "½ ks" },
      { name: "Česnek", amount: "2 stroužky" },
      { name: "Olivový olej", amount: "1 lžíce" },
      { name: "Petržel", amount: "hrst" },
      { name: "Sůl, pepř", amount: "dle chuti" },
    ],
    instructions: "Filé ochutíme solí, pepřem, česnekem a citronem. Pečeme 15–20 min při 180 °C. Posypeme petrželí.",
    type: "dinner",
    preparation: "Pečení",
  },
  {
    id: 22,
    name: "Zeleninové curry s tofu",
    image: null,
    emoji: "🍛",
    ingredients: [
      { name: "Tofu", amount: "200 g" },
      { name: "Kokosové mléko", amount: "200 ml" },
      { name: "Cuketa", amount: "1 ks" },
      { name: "Mrkev", amount: "2 ks" },
      { name: "Cibule", amount: "1 ks" },
      { name: "Curry pasta", amount: "2 lžíce" },
      { name: "Rýže basmati", amount: "80 g" },
    ],
    instructions: "Osmažíme cibuli s curry pastou, přidáme zeleninu a tofu, zalijeme kokosovým mlékem. Vaříme 15 min. Podáváme s rýží.",
    type: "dinner",
    preparation: "Vaření",
  },
  {
    id: 23,
    name: "Pohankový salát s grilovaným kuřetem",
    image: null,
    emoji: "🥗",
    ingredients: [
      { name: "Pohanka", amount: "80 g" },
      { name: "Kuřecí prsa", amount: "150 g" },
      { name: "Rukola", amount: "hrst" },
      { name: "Rajče", amount: "2 ks" },
      { name: "Okurka", amount: "½ ks" },
      { name: "Olivový olej", amount: "2 lžíce" },
      { name: "Citronová šťáva", amount: "1 lžíce" },
    ],
    instructions: "Pohanka uvaříme. Kuřecí prsa ugrilujeme a nakrájíme. Smícháme se zeleninou, polijeme dresinkem.",
    type: "dinner",
    preparation: "Vaření + Grilování",
  }, {
    id: 24,
    name: "Chia pudink s lesním ovocem",
    image: null,
    emoji: "🍮",
    ingredients: [
      { name: "Chia semínka", amount: "3 lžíce" },
      { name: "Mandlové mléko", amount: "200 ml" },
      { name: "Mražené borůvky", amount: "hrst" },
      { name: "Čekankový sirup", amount: "1 lžička" }
    ],
    instructions: "Semínka smícháme s mlékem a sirupem, necháme v lednici přes noc nabobtnat. Ráno přidáme ovoce.",
    type: "breakfast",
    preparation: "Bez vaření"
  },
  {
    id: 25,
    name: "Ovesné lívance s tvarohem",
    image: null,
    emoji: "🥞",
    ingredients: [
      { name: "Ovesné vločky mleté", amount: "50 g" },
      { name: "Nízkotučný tvaroh", amount: "100 g" },
      { name: "Vejce", amount: "1 ks" },
      { name: "Prášek do pečiva", amount: "špetka" }
    ],
    instructions: "Vše smícháme v těsto a opékáme na sucho na kvalitní pánvi.",
    type: "breakfast",
    preparation: "Smažení"
  },
  {
    id: 26,
    name: "Tvarohová pomazánka s budapeští",
    image: null,
    emoji: "🥣",
    ingredients: [
      { name: "Měkký tvaroh", amount: "125 g" },
      { name: "Mletá paprika", amount: "1 lžička" },
      { name: "Jarní cibulka", amount: "1 ks" },
      { name: "Žitný chléb", amount: "2 plátky" }
    ],
    instructions: "Tvaroh vyšleháme s paprikou a cibulkou, mažeme na chléb.",
    type: "breakfast",
    preparation: "Bez vaření"
  },
  {
    id: 27,
    name: "Míchaná tofu vajíčka (vegan)",
    image: null,
    emoji: "🥣",
    ingredients: [
      { name: "Lahůdkové tofu", amount: "180 g" },
      { name: "Kurkuma", amount: "špetka" },
      { name: "Černá sůl (Kala Namak)", amount: "špetka" },
      { name: "Lahůdkové droždí", amount: "1 lžíce" }
    ],
    instructions: "Tofu rozdrobíme na pánev, přidáme koření a prohřejeme. Chutná jako vejce.",
    type: "breakfast",
    preparation: "Smažení"
  },

  // ===== OBĚDY (Zdravé a syté) =====
  {
    id: 28,
    name: "Krůtí plátek na šalvěji a bulgur",
    image: null,
    emoji: "🦃",
    ingredients: [
      { name: "Krůtí prsa", amount: "150 g" },
      { name: "Bulgur", amount: "60 g (suchý)" },
      { name: "Sušená šalvěj", amount: "špetka" },
      { name: "Cuketa", amount: "1/2 ks" }
    ],
    instructions: "Maso opečeme na troše oleje se šalvějí. Bulgur uvaříme dle návodu. Cuketu orestujeme k masu.",
    type: "lunch",
    preparation: "Smažení + Vaření"
  },
  {
    id: 29,
    name: "Pstruh na kmíně s pečenou dýní",
    image: null,
    emoji: "🐟",
    ingredients: [
      { name: "Pstruh duhový (filé)", amount: "200 g" },
      { name: "Dýně Hokkaido", amount: "250 g" },
      { name: "Kmín", amount: "špetka" },
      { name: "Olivový olej", amount: "1 lžíce" }
    ],
    instructions: "Dýni nakrájíme na měsíčky, pokapeme olejem a pečeme s rybou 20 min na 200 °C.",
    type: "lunch",
    preparation: "Pečení"
  },
  {
    id: 30,
    name: "Cizrnové curry s kokosovým mlékem",
    image: null,
    emoji: "🍛",
    ingredients: [
      { name: "Cizrna (sterilovaná)", amount: "200 g" },
      { name: "Kokosové mléko light", amount: "150 ml" },
      { name: "Špenát čerstvý", amount: "2 hrsti" },
      { name: "Kari koření", amount: "1 lžíce" }
    ],
    instructions: "Cizrna prohřejeme s mlékem a kari, na závěr necháme zavadnout špenát. Podáváme s rýží.",
    type: "lunch",
    preparation: "Vaření"
  },
  {
    id: 31,
    name: "Těstoviny s tuňákem a olivami",
    image: null,
    emoji: "🍝",
    ingredients: [
      { name: "Celozrnné těstoviny", amount: "80 g" },
      { name: "Tuňák ve vlastní šťávě", amount: "1 konzerva" },
      { name: "Černé olivy", amount: "5 ks" },
      { name: "Rajčatová passata", amount: "100 ml" }
    ],
    instructions: "Těstoviny uvaříme. Passatu prohřejeme s tuňákem a olivami, smícháme s těstovinami.",
    type: "lunch",
    preparation: "Vaření"
  },

  // ===== SVAČINY (Rychlovky) =====
  {
    id: 32,
    name: "Kefír s vlašskými ořechy",
    image: null,
    emoji: "🥛",
    ingredients: [
      { name: "Nízkotučný kefír", amount: "250 ml" },
      { name: "Vlašské ořechy", amount: "15 g" }
    ],
    instructions: "Vypijeme kefír a zajídáme ořechy. Ideální na cesty.",
    type: "snack",
    preparation: "Bez vaření"
  },
  {
    id: 33,
    name: "Hummus s řapíkatým celerem",
    image: null,
    emoji: "🥒",
    ingredients: [
      { name: "Hummus", amount: "60 g" },
      { name: "Řapíkatý celer", amount: "2 stonky" }
    ],
    instructions: "Celer nakrájíme na špalky a namáčíme do hummusu.",
    type: "snack",
    preparation: "Bez vaření"
  },

  // ===== VEČEŘE (Lehké a proteinové) =====
  {
    id: 34,
    name: "Salát s halloumi sýrem a granátovým jablkem",
    image: null,
    emoji: "🥗",
    ingredients: [
      { name: "Halloumi light", amount: "80 g" },
      { name: "Mix listových salátů", amount: "100 g" },
      { name: "Granátové jablko", amount: "2 lžíce semen" },
      { name: "Balsamico", amount: "1 lžička" }
    ],
    instructions: "Halloumi opečeme na sucho na pánvi. Položíme na salát, posypeme granátovým jablkem.",
    type: "dinner",
    preparation: "Smažení"
  },
  {
    id: 35,
    name: "Hovězí steak s fazolkami",
    image: null,
    emoji: "🥩",
    ingredients: [
      { name: "Hovězí svíčková nebo falešná", amount: "150 g" },
      { name: "Zelené fazolky", amount: "200 g" },
      { name: "Česnek", amount: "1 stroužek" }
    ],
    instructions: "Maso opečeme dle preferencí. Fazolky podusíme na páře a pak krátce orestujeme s česnekem.",
    type: "dinner",
    preparation: "Smažení + Dušení"
  },
  {
    id: 36,
    name: "Kuskus s uzeným tempehem",
    image: null,
    emoji: "🥗",
    ingredients: [
      { name: "Kuskus", amount: "50 g" },
      { name: "Uzený tempeh", amount: "100 g" },
      { name: "Sušená rajčata", amount: "3 ks" },
      { name: "Rukola", amount: "hrst" }
    ],
    instructions: "Kuskus zalijeme horkou vodou. Tempeh nakrájíme na kostky a opečeme. Vše smícháme s rukolou.",
    type: "dinner",
    preparation: "Bez vaření + Smažení"
  },
  {
    id: 37,
    name: "Zapečená cuketa s mletým masem",
    image: null,
    emoji: "🥒",
    ingredients: [
      { name: "Cuketa velká", amount: "1 ks" },
      { name: "Mleté krůtí maso", amount: "150 g" },
      { name: "Cibule", amount: "1/2 ks" },
      { name: "Mozzarella light", amount: "50 g" }
    ],
    instructions: "Cuketu vydlabeme. Vnitřek osmažíme s masem a cibulí, naplníme zpět a zapečeme se sýrem.",
    type: "dinner",
    preparation: "Pečení + Smažení"
  },
  {
    id: 38,
    name: "Krevety na česneku s bagetkou",
    image: null,
    emoji: "🦐",
    ingredients: [
      { name: "Krevety loupané", amount: "150 g" },
      { name: "Česnek", amount: "2 stroužky" },
      { name: "Petrželka", amount: "hrst" },
      { name: "Celozrnná bageta", amount: "50 g" }
    ],
    instructions: "Krevety orestujeme na troše oleje s česnekem (cca 3 min), posypeme petrželkou a podáváme s bagetou.",
    type: "dinner",
    preparation: "Smažení"
  },
  {
    id: 39,
    name: "Quinoa salát s pečenou červenou řepou",
    image: null,
    emoji: "🥣",
    ingredients: [
      { name: "Quinoa", amount: "60 g" },
      { name: "Vařená červená řepa", amount: "150 g" },
      { name: "Balkánský sýr", amount: "30 g" },
      { name: "Slunečnicová semínka", amount: "1 lžíce" }
    ],
    instructions: "Quinou uvaříme. Řepu nakrájíme na kostky, smícháme s quinou a sýrem, posypeme semínky.",
    type: "dinner",
    preparation: "Vaření"
  }, {
    id: 40,
    name: "Slané ovesné vločky s vejcem",
    emoji: "🥣",
    ingredients: [
      { name: "Ovesné vločky", amount: "60 g" },
      { name: "Vejce", amount: "1 ks" },
      { name: "Parmazán", amount: "10 g" },
      { name: "Jarní cibulka", amount: "1 ks" }
    ],
    instructions: "Vločky uvaříme ve vodě na kaši, vmícháme sýr a navrch dáme pošírované nebo nahniličko uvařené vejce.",
    type: "breakfast",
    preparation: "Vaření"
  },
  {
    id: 41,
    name: "Banánový chlebíček v hrnečku (Mugcake)",
    emoji: "🧁",
    ingredients: [
      { name: "Banán", amount: "1 ks" },
      { name: "Vejce", amount: "1 ks" },
      { name: "Mleté vločky", amount: "3 lžíce" },
      { name: "Kakao", amount: "1 lžička" }
    ],
    instructions: "Rozmačkáme banán, smícháme s ostatním a dáme na 3 minuty do mikrovlnky v hrnečku.",
    type: "breakfast",
    preparation: "Mikrovlnka"
  },
  {
    id: 42,
    name: "Tvarohové knedlíčky s jahodami",
    emoji: "🍓",
    ingredients: [
      { name: "Nízkotučný tvaroh", amount: "250 g" },
      { name: "Dětská krupička", amount: "80 g" },
      { name: "Vejce", amount: "1 ks" },
      { name: "Jahody", amount: "100 g" }
    ],
    instructions: "Z těsta tvoříme kuličky, vaříme v horké vodě cca 5 min, podáváme s rozmačkanými jahodami.",
    type: "breakfast",
    preparation: "Vaření"
  },

  // ===== POKRAČOVÁNÍ OBĚDY =====
  {
    id: 43,
    name: "Pečené kuřecí paličky na ratatouille",
    emoji: "🍗",
    ingredients: [
      { name: "Kuřecí paličky", amount: "2 ks" },
      { name: "Lilek", amount: "1/2 ks" },
      { name: "Cuketa", amount: "1/2 ks" },
      { name: "Rajčata", amount: "2 ks" }
    ],
    instructions: "Zeleninu nakrájíme na kostky, dáme do pekáče, na ni položíme maso a pečeme 45 min na 190 °C.",
    type: "lunch",
    preparation: "Pečení"
  },
  {
    id: 44,
    name: "Špaldové rizoto s houbami",
    emoji: "🍄",
    ingredients: [
      { name: "Špaldové kroupy", amount: "80 g" },
      { name: "Žampiony", amount: "150 g" },
      { name: "Cibule", amount: "1 ks" },
      { name: "Tymián", amount: "špetka" }
    ],
    instructions: "Kroupy uvaříme. Na pánvi orestujeme cibuli a houby s tymiánem, pak smícháme s kroupami.",
    type: "lunch",
    preparation: "Vaření + Smažení"
  },
  {
    id: 45,
    name: "Treska v papilotě se zeleninou",
    emoji: "🐟",
    ingredients: [
      { name: "Filet z tresky", amount: "200 g" },
      { name: "Baby mrkev", amount: "100 g" },
      { name: "Hrášek", amount: "50 g" },
      { name: "Máslo", amount: "1 lžička" }
    ],
    instructions: "Rybu a zeleninu dáme na pečicí papír, pokapeme citronem a máslem, zabalíme do balíčku a pečeme 20 min.",
    type: "lunch",
    preparation: "Pečení"
  },
  {
    id: 46,
    name: "Krůtí masové kuličky v rajské omáčce",
    emoji: "🍅",
    ingredients: [
      { name: "Mleté krůtí maso", amount: "150 g" },
      { name: "Rajčatová passata", amount: "200 ml" },
      { name: "Celozrnné těstoviny", amount: "80 g" },
      { name: "Skořice", amount: "špetka" }
    ],
    instructions: "Z masa vytvoříme kuličky, uvaříme je přímo v rajské omáčce (passatě). Podáváme s těstovinami.",
    type: "lunch",
    preparation: "Vaření"
  },
  {
    id: 47,
    name: "Čočkový dál (indická čočka)",
    emoji: "🥘",
    ingredients: [
      { name: "Červená čočka", amount: "100 g" },
      { name: "Kurkuma, garam masala", amount: "dle chuti" },
      { name: "Cibule", amount: "1 ks" },
      { name: "Zázvor", amount: "1 cm" }
    ],
    instructions: "Čočku vaříme s kořením do rozvaření (cca 15 min). Na závěr vmícháme orestovanou cibulku se zázvorem.",
    type: "lunch",
    preparation: "Vaření"
  },

  // ===== POKRAČOVÁNÍ SVAČINY =====
  {
    id: 48,
    name: "Pečená cizrna jako chipsy",
    emoji: "🧆",
    ingredients: [
      { name: "Cizrna z plechovky", amount: "200 g" },
      { name: "Uzená paprika", amount: "1 lžička" },
      { name: "Olivový olej", amount: "1 lžíce" }
    ],
    instructions: "Cizrnu osušíme, smícháme s olejem a paprikou. Pečeme v troubě dokřupava (cca 25 min na 200 °C).",
    type: "snack",
    preparation: "Pečení"
  },
  {
    id: 49,
    name: "Plátky okurky s uzeným lososem",
    emoji: "🥒",
    ingredients: [
      { name: "Salátová okurka", amount: "1/2 ks" },
      { name: "Uzený losos", amount: "50 g" },
      { name: "Lučina linie", amount: "30 g" }
    ],
    instructions: "Okurku nakrájíme na tlustá kolečka, potřeme lučinou a poklademe kouskem lososa.",
    type: "snack",
    preparation: "Bez vaření"
  },

  // ===== POKRAČOVÁNÍ VEČEŘE =====
  {
    id: 50,
    name: "Batátové lodičky s černými fazolemi",
    emoji: "🍠",
    ingredients: [
      { name: "Batát", amount: "1 ks" },
      { name: "Černé fazole (konzerva)", amount: "100 g" },
      { name: "Kukuřice", amount: "30 g" },
      { name: "Zakysaná smetana 12%", amount: "1 lžíce" }
    ],
    instructions: "Batát propícháme vidličkou a upečeme vcelku. Pak rozřízneme a naplníme fazolemi a kukuřicí.",
    type: "dinner",
    preparation: "Pečení"
  },
  {
    id: 51,
    name: "Pstruh na másle s brokolicovým pyré",
    emoji: "🐟",
    ingredients: [
      { name: "Pstruh filet", amount: "200 g" },
      { name: "Brokolice", amount: "250 g" },
      { name: "Citrónová kůra", amount: "trocha" }
    ],
    instructions: "Pstruha opečeme na suché pánvi s trochou másla nakonec. Brokolici uvaříme a rozmixujeme na pyré.",
    type: "dinner",
    preparation: "Vaření + Smažení"
  },
  {
    id: 52,
    name: "Těstovinový salát s řeckým jogurtem",
    emoji: "🥗",
    ingredients: [
      { name: "Těstoviny", amount: "60 g" },
      { name: "Hrášek", amount: "50 g" },
      { name: "Šunka nejvyšší jakosti", amount: "50 g" },
      { name: "Řecký jogurt 0%", amount: "100 g" }
    ],
    instructions: "Uvařené těstoviny a hrášek smícháme s jogurtem a nakrájenou šunkou. Necháme vychladit.",
    type: "dinner",
    preparation: "Vaření"
  },
  {
    id: 53,
    name: "Plněné žampiony portobello",
    emoji: "🍄",
    ingredients: [
      { name: "Žampiony portobello", amount: "2 velké ks" },
      { name: "Měkký sýr (např. brynza)", amount: "50 g" },
      { name: "Špenát", amount: "hrst" }
    ],
    instructions: "Z hub vyjmeme nožičky, naplníme sýrem a špenátem a zapečeme 15 min v troubě.",
    type: "dinner",
    preparation: "Pečení"
  },
  {
    id: 54,
    name: "Kuřecí špízy se zeleninou",
    emoji: "🍢",
    ingredients: [
      { name: "Kuřecí prsa", amount: "150 g" },
      { name: "Červená cibule", amount: "1 ks" },
      { name: "Paprika žlutá", amount: "1 ks" }
    ],
    instructions: "Maso a zeleninu nakrájíme na čtverečky, střídavě napichujeme na špejli a upečeme v troubě nebo na grilu.",
    type: "dinner",
    preparation: "Pečení"
  },
  {
    id: 55,
    name: "Falafel z trouby s tahini dresinkem",
    emoji: "🧆",
    ingredients: [
      { name: "Cizrna", amount: "200 g" },
      { name: "Cibule", amount: "1/2 ks" },
      { name: "Česnek", amount: "1 stroužek" },
      { name: "Tahini pasta", amount: "1 lžíce" }
    ],
    instructions: "Cizrnu rozmixujeme s cibulí a česnekem, tvoříme kuličky a pečeme v troubě (nesmažíme!).",
    type: "dinner",
    preparation: "Pečení"
  },
  {
    id: 56,
    name: "Slaný koláč bez těsta (Quiche)",
    emoji: "🥧",
    ingredients: [
      { name: "Vejce", amount: "3 ks" },
      { name: "Cottage sýr", amount: "200 g" },
      { name: "Pórek", amount: "1/2 ks" },
      { name: "Slanina (libová)", amount: "20 g" }
    ],
    instructions: "Vejce vyšleháme s cottage, přidáme pórek a slaninu. Nalijeme do formy a pečeme 30 min na 180 °C.",
    type: "dinner",
    preparation: "Pečení"
  },
  {
    id: 57,
    name: "Krůtí nudličky na kari s ananasem",
    emoji: "🍍",
    ingredients: [
      { name: "Krůtí prsa", amount: "150 g" },
      { name: "Ananas čerstvý", amount: "100 g" },
      { name: "Kari koření", amount: "1 lžička" },
      { name: "Rýže basmati", amount: "60 g" }
    ],
    instructions: "Maso orestujeme s kari, přidáme kousky ananasu, krátce podusíme a podáváme s rýží.",
    type: "lunch",
    preparation: "Smažení + Vaření"
  },
  {
    id: 58,
    name: "Tvarohové noky s mákem",
    emoji: "🥣",
    ingredients: [
      { name: "Tvaroh v alobalu", amount: "250 g" },
      { name: "Špaldová mouka", amount: "100 g" },
      { name: "Mletý mák", amount: "2 lžíce" },
      { name: "Xylitol/Med", amount: "1 lžíce" }
    ],
    instructions: "Z tvarohu a mouky uděláme těsto, lžící tvoříme noky a vaříme ve vodě. Posypeme mákem a sladidlem.",
    type: "breakfast",
    preparation: "Vaření"
  },
  {
    id: 59,
    name: "Hráškový krém s mátou",
    emoji: "🍵",
    ingredients: [
      { name: "Mražený hrášek", amount: "300 g" },
      { name: "Zeleninový vývar", amount: "400 ml" },
      { name: "Máta", amount: "pár lístků" }
    ],
    instructions: "Hrášek povaříme ve vývaru, rozmixujeme dohladka a přidáme mátu pro svěžest.",
    type: "lunch",
    preparation: "Vaření"
  }, { id: 60, name: "Pohanková kaše s ořechy", emoji: "🥣", ingredients: [{ name: "Pohanka lámanka", amount: "60 g" }, { name: "Vlašské ořechy", amount: "20 g" }, { name: "Sušené švestky", amount: "3 ks" }], instructions: "Pohanku uvaříme v mléce nebo vodě, ozdobíme ořechy a švestkami.", type: "breakfast", preparation: "Vaření" },
  { id: 61, name: "Žitný chléb s hummusem a okurkou", emoji: "🥪", ingredients: [{ name: "Žitný chléb", amount: "2 plátky" }, { name: "Hummus", amount: "50 g" }, { name: "Okurka", amount: "1/4 ks" }], instructions: "Chléb pomažeme hummusem a poklademe plátky okurky.", type: "breakfast", preparation: "Bez vaření" },
  { id: 62, name: "Vaječná omeleta s houbami", emoji: "🍳", ingredients: [{ name: "Vejce", amount: "2 ks" }, { name: "Žampiony", amount: "100 g" }, { name: "Petrželka", amount: "hrst" }], instructions: "Houby orestujeme, zalijeme rozšlehanými vejci a necháme srazit.", type: "breakfast", preparation: "Smažení" },
  { id: 63, name: "Jogurt s konopným semínkem a malinami", emoji: "🍧", ingredients: [{ name: "Bílý jogurt", amount: "150 g" }, { name: "Konopné semínko", amount: "1 lžíce" }, { name: "Maliny", amount: "hrst" }], instructions: "Vše smícháme v misce.", type: "breakfast", preparation: "Bez vaření" },
  { id: 64, name: "Ricotta na toastu s medem", emoji: "🍞", ingredients: [{ name: "Celozrnný toast", amount: "2 ks" }, { name: "Ricotta", amount: "60 g" }, { name: "Med", amount: "1 lžička" }], instructions: "Opečený toast potřeme ricottou a pokapeme medem.", type: "breakfast", preparation: "Bez vaření" },
  { id: 65, name: "Jáhlová kaše s meruňkami", emoji: "🥣", ingredients: [{ name: "Jáhly", amount: "50 g" }, { name: "Sušené meruňky", amount: "5 ks" }, { name: "Mandle", amount: "10 g" }], instructions: "Jáhly spaříme a uvaříme doměkka, smícháme s ovocem.", type: "breakfast", preparation: "Vaření" },
  { id: 66, name: "Kefírové smoothie s vločkami", emoji: "🥤", ingredients: [{ name: "Kefír", amount: "250 ml" }, { name: "Jemné vločky", amount: "2 lžíce" }, { name: "Borůvky", amount: "hrst" }], instructions: "Vše rozmixujeme dohladka.", type: "breakfast", preparation: "Bez vaření" },
  { id: 67, name: "Míchaná vejce na cibulce a paprice", emoji: "🍳", ingredients: [{ name: "Vejce", amount: "3 ks" }, { name: "Cibule", amount: "1/2 ks" }, { name: "Paprika", amount: "1/2 ks" }], instructions: "Zeleninu orestujeme, přidáme vejce a mícháme.", type: "breakfast", preparation: "Smažení" },
  { id: 68, name: "Tvaroh s nastrouhanou mrkví a jablkem", emoji: "🥕", ingredients: [{ name: "Tvaroh", amount: "200 g" }, { name: "Mrkev", amount: "1 ks" }, { name: "Jablko", amount: "1/2 ks" }], instructions: "Zeleninu a ovoce nastrouháme najemno a vmícháme do tvarohu.", type: "breakfast", preparation: "Bez vaření" },
  { id: 69, name: "Bulgur na sladko s rozinkami", emoji: "🥣", ingredients: [{ name: "Bulgur", amount: "60 g" }, { name: "Rozinky", amount: "1 lžíce" }, { name: "Skořice", amount: "špetka" }], instructions: "Bulgur uvaříme a necháme dojít s rozinkami.", type: "breakfast", preparation: "Vaření" },
  { id: 70, name: "Ztracené vejce na špenátovém lůžku", emoji: "🥚", ingredients: [{ name: "Vejce", amount: "1 ks" }, { name: "Čerstvý špenát", amount: "2 hrsti" }, { name: "Česnek", amount: "1 stroužek" }], instructions: "Špenát spaříme na česneku, navrch dáme ztracené vejce.", type: "breakfast", preparation: "Vaření" },
  { id: 71, name: "Quinoa snídaňová miska", emoji: "🥣", ingredients: [{ name: "Quinoa", amount: "50 g" }, { name: "Goji", amount: "1 lžíce" }, { name: "Kešu ořechy", amount: "10 g" }], instructions: "Uvařenou quinou smícháme s plody goji a ořechy.", type: "breakfast", preparation: "Vaření" },
  { id: 72, name: "Celozrnná tortilla s vejcem a sýrem", emoji: "🌯", ingredients: [{ name: "Tortilla", amount: "1 ks" }, { name: "Vejce", amount: "1 ks" }, { name: "Sýr 30%", amount: "30 g" }], instructions: "Vejce usmažíme jako placku, dáme do tortilly, posypeme sýrem a zabalíme.", type: "breakfast", preparation: "Smažení" },
  { id: 73, name: "Skyr s granátovým jablkem", emoji: "🍧", ingredients: [{ name: "Skyr natural", amount: "140 g" }, { name: "Granátové jablko", amount: "2 lžíce" }, { name: "Slunečnicová semínka", amount: "1 lžíce" }], instructions: "Skyr posypeme zrníčky a semínky.", type: "breakfast", preparation: "Bez vaření" },
  { id: 74, name: "Avokádová pěna s knackebrotem", emoji: "🥑", ingredients: [{ name: "Avokádo", amount: "1/2 ks" }, { name: "Lučina", amount: "1 lžíce" }, { name: "Knackebrot", amount: "3 ks" }], instructions: "Avokádo rozmačkáme s lučinou a mažeme na chlebíčky.", type: "breakfast", preparation: "Bez vaření" },
  { id: 75, name: "Ovesné muffiny (domácí)", emoji: "🧁", ingredients: [{ name: "Vločky", amount: "50 g" }, { name: "Bílý jogurt", amount: "50 g" }, { name: "Prášek do pečiva", amount: "1/2 lžičky" }], instructions: "Smícháme a pečeme 20 min v silikonových formičkách.", type: "breakfast", preparation: "Pečení" },
  { id: 76, name: "Tvarohové lívanečky bez mouky", emoji: "🥞", ingredients: [{ name: "Tvaroh", amount: "125 g" }, { name: "Vejce", amount: "1 ks" }, { name: "Protein", amount: "20 g" }], instructions: "Smícháme v těsto a opékáme na nepřilnavé pánvi.", type: "breakfast", preparation: "Smažení" },
  { id: 77, name: "Cottage s ředkvičkami a pažitkou", emoji: "🥣", ingredients: [{ name: "Cottage sýr", amount: "200 g" }, { name: "Ředkvičky", amount: "5 ks" }, { name: "Pažitka", amount: "hrst" }], instructions: "Ředkvičky nakrájíme nadrobno a smícháme se sýrem.", type: "breakfast", preparation: "Bez vaření" },
  { id: 78, name: "Zapečený toast s rajčetem a bazalkou", emoji: "🥪", ingredients: [{ name: "Celozrnný toast", amount: "2 plátky" }, { name: "Mozzarella light", amount: "50 g" }, { name: "Rajče", amount: "1/2 ks" }], instructions: "Poklademe sýrem a rajčetem, zapečeme v troubě nebo toasteru.", type: "breakfast", preparation: "Pečení" },
  { id: 79, name: "Krupicová kaše ze špaldy", emoji: "🥣", ingredients: [{ name: "Špaldová krupice", amount: "40 g" }, { name: "Nízkotučné mléko", amount: "250 ml" }, { name: "Kakao", amount: "na posyp" }], instructions: "Uvaříme hustou kaši, posypeme čistým kakaem.", type: "breakfast", preparation: "Vaření" },

  // ===== OBĚDY (40 receptů) =====
  { id: 80, name: "Kuřecí prsa v jogurtové marinádě", emoji: "🍗", ingredients: [{ name: "Kuřecí prsa", amount: "150 g" }, { name: "Bílý jogurt", amount: "2 lžíce" }, { name: "Česnek", amount: "1 stroužek" }], instructions: "Maso naložíme do jogurtu a česneku, pak upečeme v troubě.", type: "lunch", preparation: "Pečení" },
  { id: 81, name: "Hovězí guláš v pomalém hrnci (bez mouky)", emoji: "🥘", ingredients: [{ name: "Hovězí zadní", amount: "150 g" }, { name: "Cibule", amount: "150 g" }, { name: "Paprika mletá", amount: "1 lžíce" }], instructions: "Maso dusíme s velkým množstvím cibule, dokud se cibule nerozpadne a omáčku nezahustí.", type: "lunch", preparation: "Dušení" },
  { id: 82, name: "Pstruh na bylinkách s bramborem", emoji: "🐟", ingredients: [{ name: "Pstruh", amount: "1 ks" }, { name: "Brambory", amount: "200 g" }, { name: "Rozmarýn", amount: "snítka" }], instructions: "Rybu naplníme bylinkami a pečeme v troubě společně s brambory.", type: "lunch", preparation: "Pečení" },
  { id: 83, name: "Těstoviny se špenátem a kuřecím", emoji: "🍝", ingredients: [{ name: "Celozrnné těstoviny", amount: "80 g" }, { name: "Kuřecí maso", amount: "100 g" }, { name: "Mražený špenát", amount: "100 g" }], instructions: "Maso orestujeme, přidáme špenát a smícháme s uvařenými těstovinami.", type: "lunch", preparation: "Vaření + Smažení" },
  { id: 84, name: "Pečený králík na česneku", emoji: "🐇", ingredients: [{ name: "Králičí stehno", amount: "1 ks" }, { name: "Česnek", amount: "3 stroužky" }, { name: "Špenát dušený", amount: "150 g" }], instructions: "Králíka pečeme s česnekem podlitého vodou doměkka.", type: "lunch", preparation: "Pečení" },
  { id: 85, name: "Cizrna na paprice s rýží", emoji: "🥘", ingredients: [{ name: "Cizrna", amount: "200 g" }, { name: "Smetana 12%", amount: "50 ml" }, { name: "Rýže", amount: "60 g" }], instructions: "Cizrnu prohřejeme v omáčce z papriky a smetany. Podáváme s rýží.", type: "lunch", preparation: "Vaření" },
  { id: 86, name: "Krůtí steak s grilovaným chřestem", emoji: "🥩", ingredients: [{ name: "Krůtí prsa", amount: "150 g" }, { name: "Zelený chřest", amount: "200 g" }, { name: "Citron", amount: "1/2 ks" }], instructions: "Maso a chřest ugrilujeme na pánvi, pokapeme citronem.", type: "lunch", preparation: "Grilování" },
  { id: 87, name: "Čočkový salát s fetou", emoji: "🥗", ingredients: [{ name: "Černá čočka Beluga", amount: "80 g" }, { name: "Feta sýr", amount: "40 g" }, { name: "Červená řepa", amount: "100 g" }], instructions: "Uvařenou čočku smícháme s řepou a sýrem.", type: "lunch", preparation: "Vaření" },
  { id: 88, name: "Zapečená ryba s rajčaty a mozzarellou", emoji: "🐟", ingredients: [{ name: "Bílá ryba", amount: "200 g" }, { name: "Cherry rajčata", amount: "100 g" }, { name: "Mozzarella", amount: "50 g" }], instructions: "Rybu poklademe rajčaty a sýrem, zapékáme 15 min.", type: "lunch", preparation: "Pečení" },
  { id: 89, name: "Pohankové rizoto se žampiony", emoji: "🍄", ingredients: [{ name: "Pohanka", amount: "80 g" }, { name: "Žampiony", amount: "150 g" }, { name: "Parmazán", amount: "15 g" }], instructions: "Pohanku uvaříme a vmícháme orestované houby a sýr.", type: "lunch", preparation: "Vaření" },
  { id: 90, name: "Krůtí nudličky se zelenými fazolkami", emoji: "🥘", ingredients: [{ name: "Krůtí maso", amount: "150 g" }, { name: "Fazolové lusky", amount: "200 g" }, { name: "Slanina (minumum)", amount: "10 g" }], instructions: "Maso orestujeme s fazolkami na troše slaniny pro chuť.", type: "lunch", preparation: "Smažení" },
  { id: 91, name: "Tofu s brokolicí a kešu", emoji: "🥢", ingredients: [{ name: "Uzené tofu", amount: "180 g" }, { name: "Brokolice", amount: "200 g" }, { name: "Kešu ořechy", amount: "20 g" }], instructions: "Rychle orestujeme na pánvi se sójovou omáčkou.", type: "lunch", preparation: "Smažení" },
  { id: 92, name: "Pstruh lososovitý s batátovým pyré", emoji: "🐟", ingredients: [{ name: "Pstruh lososovitý", amount: "180 g" }, { name: "Batáty", amount: "200 g" }], instructions: "Rybu upečeme, batáty uvaříme a rozmixujeme.", type: "lunch", preparation: "Pečení + Vaření" },
  { id: 93, name: "Hovězí plátek na přírodno s rýží", emoji: "🥩", ingredients: [{ name: "Hovězí zadní", amount: "150 g" }, { name: "Rýže", amount: "60 g" }, { name: "Hořčice", amount: "1 lžička" }], instructions: "Maso naklepeme a dusíme na vodě s trochou hořčice.", type: "lunch", preparation: "Dušení" },
  { id: 94, name: "Špagety s domácím bazalkovým pestem", emoji: "🍝", ingredients: [{ name: "Celozrnné špagety", amount: "80 g" }, { name: "Bazalka", amount: "hrst" }, { name: "Pinie", amount: "10 g" }], instructions: "Bazalku s piniemi a olejem rozmixujeme a smícháme s těstoviny.", type: "lunch", preparation: "Vaření" },
  { id: 95, name: "Pečená krůtí játra na cibulce", emoji: "🥘", ingredients: [{ name: "Krůtí játra", amount: "150 g" }, { name: "Cibule", amount: "2 ks" }, { name: "Rýže", amount: "60 g" }], instructions: "Játra orestujeme s velkým množstvím cibule, solíme až nakonec.", type: "lunch", preparation: "Smažení" },
  { id: 96, name: "Plněná paprika mletým krůtím a rýží", emoji: "🫑", ingredients: [{ name: "Paprika", amount: "1 ks" }, { name: "Krůtí mleté", amount: "100 g" }, { name: "Rajčatová omáčka", amount: "200 ml" }], instructions: "Papriku naplníme směsí a dusíme v rajčatové omáčce.", type: "lunch", preparation: "Pečení" },
  { id: 97, name: "Kuskus se zeleninou a balkánským sýrem", emoji: "🥗", ingredients: [{ name: "Kuskus", amount: "60 g" }, { name: "Mražená zelenina", amount: "150 g" }, { name: "Balkánský sýr", amount: "30 g" }], instructions: "Kuskus zalijeme horkou vodou, smícháme se spařenou zeleninou a sýrem.", type: "lunch", preparation: "Bez vaření" },
  { id: 98, name: "Pečená cuketa s parmazánovou krustou", emoji: "🥒", ingredients: [{ name: "Cuketa", amount: "1 ks" }, { name: "Parmazán", amount: "30 g" }, { name: "Strouhanka", amount: "1 lžíce" }], instructions: "Plátky cukety obalíme v sýru a upečeme v troubě dokřupava.", type: "lunch", preparation: "Pečení" },
  { id: 99, name: "Indické dál z červené čočky", emoji: "🥘", ingredients: [{ name: "Červená čočka", amount: "100 g" }, { name: "Kari koření", amount: "1 lžička" }, { name: "Kokosové mléko", amount: "50 ml" }], instructions: "Čočku uvaříme s kari a zjemníme mlékem.", type: "lunch", preparation: "Vaření" },
  { id: 100, name: "Těstoviny s ricottou a špenátem", emoji: "🍝", ingredients: [{ name: "Těstoviny", amount: "80 g" }, { name: "Ricotta", amount: "100 g" }, { name: "Čerstvý špenát", amount: "2 hrsti" }], instructions: "Uvařené těstoviny promícháme s ricottou a spařeným špenátem.", type: "lunch", preparation: "Vaření" },
  { id: 101, name: "Kuřecí salát s mangem a avokádem", emoji: "🥗", ingredients: [{ name: "Kuřecí prsa", amount: "100 g" }, { name: "Mango", amount: "1/4 ks" }, { name: "Avokádo", amount: "1/2 ks" }], instructions: "Maso orestujeme a smícháme s kousky ovoce a salátem.", type: "lunch", preparation: "Smažení" },
  { id: 102, name: "Dušená hovězí líčka na víně", emoji: "🥘", ingredients: [{ name: "Hovězí líčka", amount: "200 g" }, { name: "Červené víno", amount: "100 ml" }, { name: "Kořenová zelenina", amount: "200 g" }], instructions: "Líčka dusíme se zeleninou a vínem několik hodin doměkka.", type: "lunch", preparation: "Dušení" },
  { id: 103, name: "Krůtí roláda se špenátem", emoji: "🌯", ingredients: [{ name: "Krůtí prsa", amount: "150 g" }, { name: "Špenát", amount: "hrst" }, { name: "Česnek", amount: "1 stroužek" }], instructions: "Maso rozklepeme, naplníme špenátem, srolujeme a upečeme.", type: "lunch", preparation: "Pečení" },
  { id: 104, name: "Losos v teriyaki omáčce s rýží", emoji: "🐟", ingredients: [{ name: "Losos", amount: "150 g" }, { name: "Teriyaki omáčka", amount: "2 lžíce" }, { name: "Rýže", amount: "60 g" }], instructions: "Lososa potřeme omáčkou a upečeme, podáváme s rýží.", type: "lunch", preparation: "Pečení" },
  { id: 105, name: "Rýžové nudle s krevetami a limetkou", emoji: "🍜", ingredients: [{ name: "Rýžové nudle", amount: "60 g" }, { name: "Krevety", amount: "100 g" }, { name: "Limetka", amount: "1 ks" }], instructions: "Nudle zalijeme vodou, krevety orestujeme a smícháme s limetkou.", type: "lunch", preparation: "Smažení" },
  { id: 106, name: "Bulgur s pečenou paprikou a cizrnou", emoji: "🥗", ingredients: [{ name: "Bulgur", amount: "60 g" }, { name: "Paprika pečená", amount: "1 ks" }, { name: "Cizrna", amount: "100 g" }], instructions: "Smícháme uvařený bulgur s kousky papriky a cizrnou.", type: "lunch", preparation: "Vaření" },
  { id: 107, name: "Zapečený květák s vejcem a šunkou", emoji: "🥦", ingredients: [{ name: "Květák", amount: "1/2 ks" }, { name: "Vejce", amount: "2 ks" }, { name: "Šunka", amount: "50 g" }], instructions: "Předvařený květák dáme do pekáče, zalijeme vejci se šunkou a zapečeme.", type: "lunch", preparation: "Pečení" },
  { id: 108, name: "Krůtí placičky s cuketou", emoji: "🥘", ingredients: [{ name: "Krůtí mleté", amount: "150 g" }, { name: "Cuketa", amount: "1/2 ks" }, { name: "Česnek", amount: "1 stroužek" }], instructions: "Cuketu nastrouháme, vymačkáme vodu, smícháme s masem a pečeme jako placky.", type: "lunch", preparation: "Pečení" },
  { id: 109, name: "Zeleninové lečo s vejcem a žitným chlebem", emoji: "🥘", ingredients: [{ name: "Paprika, rajče, cibule", amount: "300 g" }, { name: "Vejce", amount: "2 ks" }, { name: "Žitný chléb", amount: "1 plátek" }], instructions: "Zeleninu podusíme, vmícháme vejce.", type: "lunch", preparation: "Dušení" },
  { id: 110, name: "Srnčí (nebo hovězí) na brusinkách", emoji: "🥩", ingredients: [{ name: "Maso", amount: "150 g" }, { name: "Brusinkový džem (méně cukru)", amount: "1 lžička" }, { name: "Kořenová zelenina", amount: "150 g" }], instructions: "Maso dusíme se zeleninou, nakonec přidáme brusinky.", type: "lunch", preparation: "Dušení" },
  { id: 111, name: "Treska s bylinkovou krustou", emoji: "🐟", ingredients: [{ name: "Treska", amount: "200 g" }, { name: "Petrželka, bazalka", amount: "hrst" }, { name: "Ořechy mleté", amount: "1 lžíce" }], instructions: "Rybu potřeme směsí bylinek a ořechů a upečeme.", type: "lunch", preparation: "Pečení" },
  { id: 112, name: "Těstoviny Carbonara (zdravější verze)", emoji: "🍝", ingredients: [{ name: "Celozrnné špagety", amount: "80 g" }, { name: "Žloutek", amount: "2 ks" }, { name: "Slanina krůtí", amount: "20 g" }], instructions: "Slaninu orestujeme, těstoviny smícháme se žloutky mimo oheň.", type: "lunch", preparation: "Vaření" },
  { id: 113, name: "Salát s roastbeefem a křenem", emoji: "🥗", ingredients: [{ name: "Roastbeef", amount: "100 g" }, { name: "Rukola", amount: "2 hrsti" }, { name: "Křen čerstvý", amount: "trocha" }], instructions: "Plátky masa poklademe na salát a ozdobíme křenem.", type: "lunch", preparation: "Bez vaření" },
  { id: 114, name: "Boršč s hovězím masem", emoji: "🥣", ingredients: [{ name: "Hovězí maso", amount: "100 g" }, { name: "Červená řepa", amount: "1 ks" }, { name: "Zelí", amount: "100 g" }], instructions: "Hustá polévka z masa a zeleniny.", type: "lunch", preparation: "Vaření" },
  { id: 115, name: "Slaný ovesný koláč se sýrem a šunkou", emoji: "🥧", ingredients: [{ name: "Vločky", amount: "100 g" }, { name: "Vejce", amount: "2 ks" }, { name: "Šunka", amount: "50 g" }], instructions: "Vytvoříme těsto z vloček a vajec, poklademe šunkou a zapečeme.", type: "lunch", preparation: "Pečení" },
  { id: 116, name: "Grilovaný camembert light s brusinkami", emoji: "🧀", ingredients: [{ name: "Camembert 30%", amount: "1 ks" }, { name: "Brusinky", amount: "1 lžička" }, { name: "Salát", amount: "150 g" }], instructions: "Sýr krátce ogrilujeme a podáváme se salátem.", type: "lunch", preparation: "Grilování" },
  { id: 117, name: "Kuřecí prsa plněná sušenými rajčaty", emoji: "🍗", ingredients: [{ name: "Kuřecí prsa", amount: "150 g" }, { name: "Sušená rajčata", amount: "3 ks" }], instructions: "Do masa uděláme kapsu, naplníme rajčaty a opečeme.", type: "lunch", preparation: "Smažení" },
  { id: 118, name: "Telecí steak s hráškovým pyré", emoji: "🥩", ingredients: [{ name: "Telecí maso", amount: "150 g" }, { name: "Mražený hrášek", amount: "200 g" }], instructions: "Maso opečeme, hrášek uvaříme a rozmixujeme s trochou másla.", type: "lunch", preparation: "Smažení + Vaření" },
  { id: 119, name: "Bramborové noky s šalvějí a kuřecím", emoji: "🍝", ingredients: [{ name: "Noky", amount: "150 g" }, { name: "Kuřecí maso", amount: "100 g" }, { name: "Šalvěj", amount: "hrst" }], instructions: "Maso orestujeme, přidáme šalvěj a promícháme s uvařenými noky.", type: "lunch", preparation: "Vaření + Smažení" },

  // ===== SVAČINY (20 receptů) =====
  { id: 120, name: "Tvaroh s kakaem a oříšky", emoji: "🥣", ingredients: [{ name: "Tvaroh", amount: "150 g" }, { name: "Kakao", amount: "1 lžička" }, { name: "Lískové ořechy", amount: "10 g" }], instructions: "Smícháme tvaroh s kakaem, posypeme ořechy.", type: "snack", preparation: "Bez vaření" },
  { id: 121, name: "Kousek kvalitního sýra a hrozny", emoji: "🧀", ingredients: [{ name: "Ementál", amount: "30 g" }, { name: "Hroznové víno", amount: "100 g" }], instructions: "Podáváme k přímé konzumaci.", type: "snack", preparation: "Bez vaření" },
  { id: 122, name: "Zeleninové chipsy z trouby", emoji: "🥕", ingredients: [{ name: "Celer, mrkev, řepa", amount: "200 g" }, { name: "Olivový olej", amount: "1 lžička" }], instructions: "Zeleninu nakrájíme na tenké plátky a pečeme v troubě na 150 °C.", type: "snack", preparation: "Pečení" },
  { id: 123, name: "Proteinová tyčinka (domácí)", emoji: "🍫", ingredients: [{ name: "Vločky", amount: "50 g" }, { name: "Protein", amount: "30 g" }, { name: "Ořechové máslo", amount: "1 lžíce" }], instructions: "Smícháme, vytvarujeme a necháme ztuhnout v lednici.", type: "snack", preparation: "Bez vaření" },
  { id: 124, name: "Olivy a plátky šunky", emoji: "🫒", ingredients: [{ name: "Olivy", amount: "10 ks" }, { name: "Šunka nejvyšší jakosti", amount: "50 g" }], instructions: "Rolky šunky prokládáme olivami.", type: "snack", preparation: "Bez vaření" },
  { id: 125, name: "Chia pudink s kokosem", emoji: "🥥", ingredients: [{ name: "Chia semínka", amount: "2 lžíce" }, { name: "Kokosové mléko", amount: "100 ml" }], instructions: "Semínka namočíme v mléce přes noc.", type: "snack", preparation: "Bez vaření" },
  { id: 126, name: "Řapíkatý celer s arašídovým máslem", emoji: "🥜", ingredients: [{ name: "Řapíkatý celer", amount: "2 řapíky" }, { name: "Arašídové máslo", amount: "1 lžíce" }], instructions: "Celer potřeme máslem.", type: "snack", preparation: "Bez vaření" },
  { id: 127, name: "Sušené hovězí maso (Jerky)", emoji: "🥩", ingredients: [{ name: "Hovězí jerky", amount: "30 g" }], instructions: "Vysokoproteinová svačina k okamžité spotřebě.", type: "snack", preparation: "Bez vaření" },
  { id: 128, name: "Domácí jablečná přesnídávka bez cukru", emoji: "🍎", ingredients: [{ name: "Jablka", amount: "2 ks" }], instructions: "Jablka rozvaříme s trochou vody a rozmixujeme.", type: "snack", preparation: "Vaření" },
  { id: 129, name: "Kysané zelí se semínky", emoji: "🥬", ingredients: [{ name: "Kysané zelí", amount: "150 g" }, { name: "Dýňová semínka", amount: "1 lžíce" }], instructions: "Smícháme pro podporu mikroflóry.", type: "snack", preparation: "Bez vaření" },
  { id: 130, name: "Slunečnicová semínka a hruška", emoji: "🍐", ingredients: [{ name: "Hruška", amount: "1 ks" }, { name: "Slunečnice", amount: "20 g" }], instructions: "Hrušku nakrájíme a posypeme semínky.", type: "snack", preparation: "Bez vaření" },
  { id: 131, name: "Plátek celozrnného chleba s tvarohem a pažitkou", emoji: "🍞", ingredients: [{ name: "Chléb", amount: "1 plátek" }, { name: "Tvaroh", amount: "50 g" }], instructions: "Pomažeme a posypeme bylinkami.", type: "snack", preparation: "Bez vaření" },
  { id: 132, name: "Tofu nakrájené na kostičky", emoji: "🧊", ingredients: [{ name: "Uzené tofu", amount: "100 g" }], instructions: "Rychlá bílkovina na cestu.", type: "snack", preparation: "Bez vaření" },
  { id: 133, name: "Pár mandlí a kousek hořké čokolády", emoji: "🍫", ingredients: [{ name: "Mandle", amount: "10 ks" }, { name: "Hořká čokoláda 85%", amount: "1 čtvereček" }], instructions: "Pojídáme dohromady.", type: "snack", preparation: "Bez vaření" },
  { id: 134, name: "Zeleninový salát s tuňákem", emoji: "🥗", ingredients: [{ name: "Tuňák", amount: "80 g" }, { name: "Mix salátů", amount: "100 g" }], instructions: "Tuňáka smícháme se salátem.", type: "snack", preparation: "Bez vaření" },
  { id: 135, name: "Mražené hrozny (jako bonbóny)", emoji: "🍇", ingredients: [{ name: "Hroznové víno", amount: "100 g" }], instructions: "Dejte na 2 hodiny do mrazáku. Skvělá letní svačina.", type: "snack", preparation: "Mražení" },
  { id: 136, name: "Edamame boby se solí", emoji: "🫛", ingredients: [{ name: "Sójové boby edamame", amount: "100 g" }], instructions: "Krátce povaříme a osolíme.", type: "snack", preparation: "Vaření" },
  { id: 137, name: "Cottage na sladko se skořicí", emoji: "🥣", ingredients: [{ name: "Cottage sýr", amount: "200 g" }, { name: "Skořice", amount: "špetka" }, { name: "Stevia/Med", amount: "kapka" }], instructions: "Smícháme v misce.", type: "snack", preparation: "Bez vaření" },
  { id: 138, name: "Plátky papriky s lučinou", emoji: "🫑", ingredients: [{ name: "Paprika", amount: "1 ks" }, { name: "Lučina", amount: "30 g" }], instructions: "Papriku nakrájíme na pruhy a namáčíme v sýru.", type: "snack", preparation: "Bez vaření" },
  { id: 139, name: "Sušené brusinky (bez cukru) a vlašáky", emoji: "🫐", ingredients: [{ name: "Brusinky", amount: "20 g" }, { name: "Vlašské ořechy", amount: "20 g" }], instructions: "Smícháme v pytlíčku na cesty.", type: "snack", preparation: "Bez vaření" },

  // ===== VEČEŘE (20 receptů) =====
  { id: 140, name: "Zapečený lilek s rajčaty a parmazánem", emoji: "🍆", ingredients: [{ name: "Lilek", amount: "1 ks" }, { name: "Rajčatová passata", amount: "100 ml" }, { name: "Parmazán", amount: "20 g" }], instructions: "Plátky lilku potřeme passatou, posypeme sýrem a zapečeme.", type: "dinner", preparation: "Pečení" },
  { id: 141, name: "Krůtí šunka se sýrem a zeleninou (bez přílohy)", emoji: "🥗", ingredients: [{ name: "Krůtí šunka", amount: "100 g" }, { name: "Sýr 30%", amount: "50 g" }, { name: "Zelenina", amount: "200 g" }], instructions: "Sestavíme talíř bohatý na bílkoviny.", type: "dinner", preparation: "Bez vaření" },
  { id: 142, name: "Rybí filé na másle se špenátem", emoji: "🐟", ingredients: [{ name: "Filé", amount: "200 g" }, { name: "Špenát", amount: "200 g" }], instructions: "Rybu opečeme, špenát podusíme na česneku.", type: "dinner", preparation: "Smažení + Dušení" },
  { id: 143, name: "Omeleta se sýrem a pažitkou", emoji: "🍳", ingredients: [{ name: "Vejce", amount: "3 ks" }, { name: "Sýr strouhaný", amount: "30 g" }], instructions: "Uděláme omeletu, sýr vložíme dovnitř.", type: "dinner", preparation: "Smažení" },
  { id: 144, name: "Teplý salát s pečenou cizrnou", emoji: "🥗", ingredients: [{ name: "Cizrna", amount: "150 g" }, { name: "Mix salátů", amount: "150 g" }, { name: "Tahini", amount: "1 lžíce" }], instructions: "Cizrnu upečeme dokřupava a přidáme do salátu s tahini dresinkem.", type: "dinner", preparation: "Pečení" },
  { id: 145, name: "Cuketové 'špagety' s krůtím masem", emoji: "🍝", ingredients: [{ name: "Cuketa", amount: "1 ks" }, { name: "Krůtí mleté", amount: "150 g" }, { name: "Rajčatová passata", amount: "100 ml" }], instructions: "Z cukety uděláme škrabkou nudle, maso orestujeme s omáčkou a smícháme.", type: "dinner", preparation: "Smažení" },
  { id: 146, name: "Tvarohová pomazánka s tuňákem", emoji: "🥣", ingredients: [{ name: "Tvaroh", amount: "150 g" }, { name: "Tuňák ve vlastní šťávě", amount: "1 konzerva" }], instructions: "Vyšleháme a podáváme se zeleninou.", type: "dinner", preparation: "Bez vaření" },
  { id: 147, name: "Hovězí carpaccio se salátem", emoji: "🥩", ingredients: [{ name: "Hovězí svíčková (tenké plátky)", amount: "80 g" }, { name: "Rukola", amount: "100 g" }, { name: "Citron", amount: "1/2 ks" }], instructions: "Maso pokapeme olejem a citronem, podáváme s rukolou.", type: "dinner", preparation: "Bez vaření" },
  { id: 148, name: "Pečený hermelín (v alobalu bez tuku)", emoji: "🧀", ingredients: [{ name: "Hermelín Figura", amount: "1 ks" }, { name: "Zelenina", amount: "200 g" }], instructions: "Sýr s bylinkami zabalíme do alobalu a zapečeme 10 min.", type: "dinner", preparation: "Pečení" },
  { id: 149, name: "Salát s krevetami a grepem", emoji: "🥗", ingredients: [{ name: "Krevety", amount: "100 g" }, { name: "Grep", amount: "1/2 ks" }, { name: "Polníček", amount: "2 hrsti" }], instructions: "Svěží kombinace, krevety jen krátce orestujeme.", type: "dinner", preparation: "Smažení" },
  { id: 150, name: "Sashimi z lososa se zázvorem", emoji: "🍣", ingredients: [{ name: "Čerstvý losos (sushi kvalita)", amount: "100 g" }, { name: "Zázvor nakládaný", amount: "trocha" }], instructions: "Syrové plátky lososa podáváme se zázvorem.", type: "dinner", preparation: "Bez vaření" },
  { id: 151, name: "Květáková rýže s kuřecím masem", emoji: "🍗", ingredients: [{ name: "Květák", amount: "1/2 ks" }, { name: "Kuřecí prsa", amount: "150 g" }], instructions: "Květák rozmixujeme na drobno (jako rýži) a orestujeme společně s masem.", type: "dinner", preparation: "Smažení" },
  { id: 152, name: "Teplá čočka na kyselo s vejcem", emoji: "🍳", ingredients: [{ name: "Čočka uvařená", amount: "200 g" }, { name: "Vejce", amount: "1 ks" }, { name: "Ocet", amount: "kapka" }], instructions: "Čočku prohřejeme, dochutíme octem a podáváme se sázeným vejcem.", type: "dinner", preparation: "Vaření" },
  { id: 153, name: "Brokolicové placičky se sýrem", emoji: "🥦", ingredients: [{ name: "Brokolice", amount: "200 g" }, { name: "Vejce", amount: "1 ks" }, { name: "Sýr strouhaný", amount: "30 g" }], instructions: "Brokolici nasekáme, smícháme s vejcem a sýrem a upečeme v troubě.", type: "dinner", preparation: "Pečení" },
  { id: 154, name: "Kuřecí vývar se zeleninou (velká porce)", emoji: "🥣", ingredients: [{ name: "Kuřecí skelet/maso", amount: "100 g" }, { name: "Zelenina kořenová", amount: "200 g" }], instructions: "Silný vývar bez nudlí, s velkým množstvím zeleniny.", type: "dinner", preparation: "Vaření" },
  { id: 155, name: "Tempeh s dušenou kapustou", emoji: "🥬", ingredients: [{ name: "Tempeh uzený", amount: "100 g" }, { name: "Růžičková kapusta", amount: "150 g" }], instructions: "Tempeh opečeme, kapustu podusíme na páře.", type: "dinner", preparation: "Dušení" },
  { id: 156, name: "Sýrový talíř s vlašskými ořechy", emoji: "🧀", ingredients: [{ name: "Mix sýrů", amount: "80 g" }, { name: "Ořechy", amount: "20 g" }], instructions: "Bílkovinná večeře bez sacharidů.", type: "dinner", preparation: "Bez vaření" },
  { id: 157, name: "Pečená dýně s mozzarellou", emoji: "🎃", ingredients: [{ name: "Dýně Hokkaido", amount: "200 g" }, { name: "Mozzarella di bufala", amount: "50 g" }], instructions: "Dýni upečeme, nakonec na ni položíme sýr, aby se mírně rozpustil.", type: "dinner", preparation: "Pečení" },
  { id: 158, name: "Králičí maso se zelenými fazolkami", emoji: "🐇", ingredients: [{ name: "Králík", amount: "150 g" }, { name: "Fazolky", amount: "200 g" }], instructions: "Dušené maso se zelenou přílohou.", type: "dinner", preparation: "Dušení" },
  { id: 159, name: "Salát s halloumi sýrem", emoji: "🧀", ingredients: [{ name: "Halloumi light", amount: "80 g" }, { name: "Zelenina mix", amount: "200 g" }], instructions: "Sýr opečeme na sucho a dáme na salát.", type: "dinner", preparation: "Smažení" },
];

export default MealsList;
