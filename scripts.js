// const shopDomain = 'superpatchdev.myshopify.com'; 
// const storefrontToken = '089c593d81ac0a00dedc2292fe2b4b68'; 
const shopDomain = 'superpatch-wholesale-dev-store-1.myshopify.com';
const storefrontToken = '209faccc7c02ca0b35f37295c2be3f18';

// ✅ Step 1: Save UTM params to sessionStorage (force lowercase)
const params = new URLSearchParams(window.location.search);
console.log(window.location.search)

params.forEach((value, key) => {
    if (key.startsWith('utm_')) {
        const lowerCaseKey = key.toLowerCase();
        console.log(`Storing UTM Param: ${lowerCaseKey} = ${value}`);
        sessionStorage.setItem(lowerCaseKey, value);
    }
});

// ✅ Step 2: Function to extract UTM params for cart attributes
function getUTMAttributes() {
    const utmParams = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term', 'utm_version'];

    const attributes = utmParams
        .map(param => {
            const value = sessionStorage.getItem(param);
            if (value) {
                console.log(`Fetched UTM Param: ${param} = ${value}`);
                return { key: param, value: value };
            }
            return null;
        })
        .filter(attr => attr !== null);

    console.log('UTM Attributes:', attributes);
    return attributes;
}

// ✅ Step 3: Create Cart Using Storefront API
async function createCart(variantId, quantity) {
    try {
        const utmAttributes = getUTMAttributes();

        const response = await fetch(`https://${shopDomain}/api/2023-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': storefrontToken,
            },
            body: JSON.stringify({
                query: `
                    mutation cartCreate($input: CartInput!) {
                        cartCreate(input: $input) {
                            cart {
                                id
                                checkoutUrl
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        lines: [
                            {
                                quantity: quantity,
                                merchandiseId: `gid://shopify/ProductVariant/${variantId}`
                            }
                        ],
                        attributes: utmAttributes // ✅ Pass UTM attributes to cart
                    }
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Cart creation result:', result);

        if (result.data.cartCreate.cart) {
            let checkoutUrl = result.data.cartCreate.cart.checkoutUrl;

            // ✅ Step 4: Manually append UTM params to checkout URL
            const urlParams = utmAttributes
                .map(attr => `${encodeURIComponent(attr.key)}=${encodeURIComponent(attr.value)}`)
                .join('&');

            if (urlParams) {
                checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + urlParams;
            }

            console.log("Final Checkout URL:", checkoutUrl);

            // ✅ Step 5: Redirect to checkout URL
            // window.location.href = checkoutUrl;
        } else {
            console.error('Cart creation failed:', result.data.cartCreate.userErrors);
        }
    } catch (error) {
        console.error('Error creating cart:', error);
    }
}

// ✅ Step 6: Event Listener for "Add to Cart"
document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', async () => {
        const variantId = document.body.dataset.variant;
        const quantity = parseInt(document.querySelector('.quantity').value) || 1;

        await createCart(variantId, quantity);
    });
});