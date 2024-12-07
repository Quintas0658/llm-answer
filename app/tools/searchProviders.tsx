"use server";
import { SearchResult } from '@/components/answer/SearchResultsComponent';
import { config } from '../config';

export async function getSearchResults(userMessage: string): Promise<any> {
    switch (config.searchProvider) {
        case "brave":
            return braveSearch(userMessage);
        case "serper":
            return serperSearch(userMessage);
        case "google":
            return googleSearch(userMessage);
        default:
            return Promise.reject(new Error(`Unsupported search provider: ${config.searchProvider}`));
    }
}

export async function braveSearch(message: string, numberOfPagesToScan = config.numberOfPagesToScan): Promise<SearchResult[]> {
    try {
        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(message)}&count=${numberOfPagesToScan}`, {
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY as string
            }
        });
        if (!response.ok) {
            console.log('Issue with response from Brave Search API');
        }
        const jsonResponse = await response.json();
        if (!jsonResponse.web || !jsonResponse.web.results) {
            throw new Error('Invalid API response format');
        }
        const final = jsonResponse.web.results.map((result: any): SearchResult => ({
            title: result.title,
            link: result.url,
            favicon: result.profile.img
        }));
        return final;
    } catch (error) {
        console.error('Error fetching search results:', error);
        throw error;
    }
}

export async function googleSearch(message: string, numberOfPagesToScan = config.numberOfPagesToScan): Promise<SearchResult[]> {
    try {
        // 记录初始参数
        console.log('Search Parameters:', { message, numberOfPagesToScan });
        
        // 检查环境变量
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_CX;
        
        console.log('Environment Variables Status:', {
            hasApiKey: !!apiKey,
            hasCx: !!cx,
            apiKeyLength: apiKey?.length,
            cxLength: cx?.length
        });

        // 如果环境变量不存在，使用硬编码值
        const finalApiKey = apiKey || 'AIzaSyD680yD2AGpGMiYEGj-Awh89Q0oVvY0qJE';
        const finalCx = cx || 'd27f43a1d5ef04263';

        const url = `https://www.googleapis.com/customsearch/v1?key=${finalApiKey}&cx=${finalCx}&q=${encodeURIComponent(message)}&num=${numberOfPagesToScan}`;
        console.log('Request URL:', url.replace(finalApiKey, 'HIDDEN_KEY'));

        const response = await fetch(url);
        console.log('Response Status:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const jsonResponse = await response.json();
        console.log('Search Results:', {
            kind: jsonResponse.kind,
            totalResults: jsonResponse.searchInformation?.totalResults,
            itemCount: jsonResponse.items?.length,
            firstItemTitle: jsonResponse.items?.[0]?.title
        });

        if (!jsonResponse.items) {
            console.error('Invalid Response Format:', jsonResponse);
            throw new Error('Invalid API response format - no items found');
        }

        const final = jsonResponse.items.map((result: any): SearchResult => ({
            title: result.title,
            link: result.link,
            favicon: result.pagemap?.cse_thumbnail?.[0]?.src || ''
        }));

        console.log('Processed Results:', {
            count: final.length,
            firstItem: final[0]
        });

        return final;
    } catch (error) {
        // 添加类型检查
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
        
        console.error('Search Error:', {
            error: errorMessage,
            stack: errorStack,
            type: errorType
        });
        throw error;
    }
}

export async function serperSearch(message: string, numberOfPagesToScan = config.numberOfPagesToScan): Promise<SearchResult[]> {
    const url = 'https://google.serper.dev/search';
    const data = JSON.stringify({
        "q": message
    });
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'X-API-KEY': process.env.SERPER_API as string,
            'Content-Type': 'application/json'
        },
        body: data
    };
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const responseData = await response.json();
        if (!responseData.organic) {
            throw new Error('Invalid API response format');
        }
        const final = responseData.organic.map((result: any): SearchResult => ({
            title: result.title,
            link: result.link,
            favicon: result.favicons?.[0] || ''
        }));
        return final
    } catch (error) {
        console.error('Error fetching search results:', error);
        throw error;
    }
}

export async function getImages(message: string): Promise<{ title: string; link: string }[]> {
    const url = 'https://google.serper.dev/images';
    const data = JSON.stringify({
        "q": message
    });
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'X-API-KEY': process.env.SERPER_API as string,
            'Content-Type': 'application/json'
        },
        body: data
    };
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const responseData = await response.json();
        const validLinks = await Promise.all(
            responseData.images.map(async (image: any) => {
                const link = image.imageUrl;
                if (typeof link === 'string') {
                    try {
                        const imageResponse = await fetch(link, { method: 'HEAD' });
                        if (imageResponse.ok) {
                            const contentType = imageResponse.headers.get('content-type');
                            if (contentType && contentType.startsWith('image/')) {
                                return {
                                    title: image.title,
                                    link: link,
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching image link ${link}:`, error);
                    }
                }
                return null;
            })
        );
        const filteredLinks = validLinks.filter((link): link is { title: string; link: string } => link !== null);
        return filteredLinks.slice(0, 9);
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
}

export async function getVideos(message: string): Promise<{ imageUrl: string, link: string }[] | null> {
    const url = 'https://google.serper.dev/videos';
    const data = JSON.stringify({
        "q": message
    });
    const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
            'X-API-KEY': process.env.SERPER_API as string,
            'Content-Type': 'application/json'
        },
        body: data
    };
    try {
        const response = await fetch(url, requestOptions);
        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }
        const responseData = await response.json();
        const validLinks = await Promise.all(
            responseData.videos.map(async (video: any) => {
                const imageUrl = video.imageUrl;
                if (typeof imageUrl === 'string') {
                    try {
                        const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
                        if (imageResponse.ok) {
                            const contentType = imageResponse.headers.get('content-type');
                            if (contentType && contentType.startsWith('image/')) {
                                return { imageUrl, link: video.link };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching image link ${imageUrl}:`, error);
                    }
                }
                return null;
            })
        );
        const filteredLinks = validLinks.filter((link): link is { imageUrl: string, link: string } => link !== null);
        return filteredLinks.slice(0, 9);
    } catch (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }
}