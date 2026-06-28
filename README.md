<h1 align="center">Coffee Compass ☕🧭</h1>

# About the Project
## Inspiration
We love great coffee and we love our community even more, but we noticed a frustrating trend, people who wanted to support independent, local roasters were often forced to choose the convenience of a big-chain drive-thru just because they were short on time. Beyond the time crunch, finding exactly what you want in a new neighborhood can be overwhelming, as it's tedious to manually sift through dozens of different menus just to see who serves your favorite brew. To solve this, we built Coffee Compass to bridge the gap. We integrated smart search filters so users can instantly find shops based on a specific drink, whether you're hunting for a specialty pour-over, a matcha latte, or a cold brew. We believe you shouldn't have to sacrifice your morning routine or your specific tastes to support a local artisan. By bringing drink-specific discovery and seamless mobile ordering to niche, independent cafes, we're giving you the best of both worlds, big-chain convenience with unmatched local flavor.

## What It Does
Coffee Compass connects you to the best independent cafes in your neighborhood in three simple steps:
+ **Discover:** Browse a curated map of niche, local roasters and hidden neighborhood hidden gems.
+ **Order Ahead:** Customize your favorite artisan drinks right in the app.
+ **Skip the Line:** Pay securely in advance and walk right in to grab your fresh brew, no waiting required

## How we Built It
We built Coffee Compass as a mobile first web app using Next.js 15 (App Router) with TypeScript, deployed on Vercel. The frontend is a set of React components with an interactive Leaflet map for plotting cafes and an adjustable search radius. Coffee shops aren't hard code, they're pulled live from OpenStreetMap's Overpass API, querying every cafe around the user's geolocation or a searched zip/city (geocoded through Nominatim), then sorted by distance using the haversine formula. The backend runs as Next.js API route handlers and server components that connect to Amazon Aurora (PostreSQL 17) over an SSL-encrypted connection using the node-postgres client with connection pooling tuned for serverless. Aurora powers everything stateful, a custom authentication system (bcrypt-hashed passwords and cookie based sessions), saved favorites, shop ownership claims verified by phone OTP, the full ordering lifecycle, and verified purchase reviews spread across six related tables (customers, customer_sessions, customer_favorites, shop_claims, orders, shop_reviews). Real time behavior, like new orders appearing on the owner dashboard and customers tracking order status is handled with lightweight polling and the ordering flow ends in a demo checkout page designed to drop in Stripe for real payments later.

## Challenges we Ran into
+ **Simulating Transactions:** Setting up a secure, live payment gateway under a tight deadline proved to be a massive hurdle. To keep the focus on the user experience, we pivoted to using realistic dummy data to simulate the entire checkout and purchase flow seamlessly.
+ **User Location & Map Integration:** Building the "Compass" aspect of our app was trickier than expected. We faced synchronization issues when trying to pull the users real time geolocation before rendering the map, requiring us to dive deep into asynchronous handling to ensure the app didn't crash while looking for nearby coordinates.

## Accomplishments that we're Proud of
+ **Empowering Small Businesses:** We successfully built a fully functioning mobile ordering feature tailored specifically for independent shops, giving them digital infrastructure to compete  with massive corporate chains.
+ **The Dual-App Ecosystem:** We designed and implemented two distinct user experiences within one platform. We created a seamless client interface for coffee lovers and a robust, intuitive vendor dashboard for shop owners. Through this shop portal, owners can manage incoming tickets in real time and instantly notify customers when their order is ready for pickup.

## What we Learned
Building Coffee Compass was a massive skill acquisition in software architecture. Our biggest takeaway was just how much backend coordination goes into a multi-user application. When managing live order, there is no room for error. If a connection drops or a notification delays, it causes immediate confusion for both the waiting customer and the busy barista. We learned how to prioritize system reliability and clear feedback loops above all else. Furthermore, this project taught us the value of rapid prototyping, pivoting to dummy data for payments allowed us to perfect the core user experience without stalling our entire development cycle.

## What's Next for Coffee Compass
We've successfully proven our core concept; now, we are ready to scale Coffee Compass into a fully live production app. First we will transition from simulated data to a secure, industry standard payment API to facilitate seamless real world transactions between coffee lovers and local shops. Second, while our current location API successfully maps nearby cafes, it occasionally misses key details. Moving forward, we plan to upgrade to a more robust, data rich business intelligence API to eliminate those gaps. This will ensure the app flawlessly and instantly populates entirely accurate, real time data for every local shop, including precise location, verified contact info and fully updated menus.
Our ultimate goal is to make onboarding effortless for new cafes and ordering absolutely flawless for our users.

## Check it out!
[coffee-ten-smoky.vercel.app](https://coffee-ten-smoky.vercel.app)
