import { MetadataRoute } from 'next';

// IMPORTANT: Replace this with your actual base URL
const BASE_URL = 'https://promptforge.aiyoda.app';

// Placeholder function - you must replace this with your actual data fetching logic
// This function should fetch the IDs (or slugs) of all PUBLIC prompts/templates
async function getPublicSlugs(): Promise<{ id: string, lastModified: Date }[]> {
    // 
    // TODO: Replace with an API call to your backend/database (e.g., using apiClient.ts)
    // to fetch the IDs and last modification dates for all PUBLIC prompt/template pages
    //
    // Example: 
    // const publicPrompts = await fetch(API_URL + '/public/prompts');
    // return publicPrompts.map(p => ({ id: p.id, lastModified: new Date(p.updatedAt) }));
    
    return [
        // Dummy data: Replace this with real data fetching
        { id: 'master-coder', lastModified: new Date('2025-11-10') },
        { id: 'marketing-copywriter', lastModified: new Date('2025-11-12') },
    ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const publicSlugs = await getPublicSlugs();

    // 1. Static Routes (Highest Priority)
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            priority: 1.0, // Highest priority for the homepage
        },
        {
            url: `${BASE_URL}/guide`, // Your guide/documentation
            lastModified: new Date(),
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/prompts/all`, // The public prompt directory
            lastModified: new Date(),
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/templates/all`, // The public template directory
            lastModified: new Date(),
            priority: 0.8,
        },
        // The search page is less important for AEO since it's just a tool
        {
            url: `${BASE_URL}/search`,
            lastModified: new Date(),
            priority: 0.5,
        },
        // IMPORTANT: Exclude pages disallowed in robots.txt (e.g., /login, /dashboard)
    ];

    // 2. Dynamic Routes (Public Prompts/Templates)
    const dynamicRoutes: MetadataRoute.Sitemap = publicSlugs.map((item) => ({
        url: `${BASE_URL}/prompts/${item.id}`, // or /templates/${item.id}
        lastModified: item.lastModified,
        priority: 0.7, // Public content is important
        changeFrequency: 'weekly', // Assume prompts are updated frequently
    }));

    return [...staticRoutes, ...dynamicRoutes];
}