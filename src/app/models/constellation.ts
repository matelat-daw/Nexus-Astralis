import { Star } from "./star";
import { Comments } from "./comments";

export interface Constellation {
    id: number,
    code: string,
    latin_name: string,
    english_name: string,
    spanish_name: string,
    mythology: string,
    area_degrees: number,
    declination: string,
    celestial_zone: string,
    ecliptic_zone: string,
    brightest_star: string,
    discovery: string,
    image_name: string,
    image_url: string,
    star: Star[],
}