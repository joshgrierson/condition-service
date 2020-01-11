interface Location {
    lat: string;
    lng: string;
    radius: string;
}

export default class Helper {
    public static formatLocationData(data: string): Location {
        let latlng: string[] = data.trim().split(",");
        let radius: string;

        if (latlng[1].includes("_")) {
            radius = latlng[1].split("_")[1];
            latlng = [latlng[0], latlng[1].replace(`_${radius}`, "")];
        }

        return {lat: latlng[0], lng: latlng[1], radius};
    }
}