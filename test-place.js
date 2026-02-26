const placeId = '1463187795';
const graphqlQuery = [
    {
        operationName: 'getPlaceBasicInfo',
        variables: { id: placeId },
        query: 'query getPlaceBasicInfo($id: String!) { business: place(id: $id) { id name category description } }'
    },
    {
        operationName: 'getPlaceMenus',
        variables: { id: placeId },
        query: 'query getPlaceMenus($id: String!) { menuInfo: place(id: $id) { menus { id name price desc } } }'
    },
    {
        operationName: 'getVisitorReviews',
        variables: { id: placeId },
        query: 'query getVisitorReviews($id: String!) { visitorReviewStats: place(id: $id) { tells { item { name } count } } }'
    }
];

fetch('https://pcmap-api.place.naver.com/place/graphql', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify(graphqlQuery)
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
