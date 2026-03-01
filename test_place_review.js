require('dotenv').config({ path: '.env.local' });
async function test() {
  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

  // Naver uses `restaurant(id)` or `place(id)`
  const query = `
      query getRestaurant($id: String) {
        restaurant(id: $id) {
          name
          category
          description
          phone
          menus {
            name
            price
          }
          keywords {
            name
          }
        }
      }
    `;

  const body = JSON.stringify({
    operationName: 'getRestaurant',
    variables: { id: "1826027582" },
    query: query
  });

  const response = await fetch('https://pcmap-api.place.naver.com/place/graphql', {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': `https://pcmap.place.naver.com/restaurant/1826027582/home`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'ko'
    },
    body: body,
    timeout: 5000
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}
test().catch(console.error);
