import folium
import requests
import time

NOMINATIM = "https://nominatim.openstreetmap.org"
OSRM = "https://router.project-osrm.org"
UA = {"User-Agent": "OSM-Demo-Folium/1.0 (contact: bsssdd24@gmail.com)"}

# địa danh => tọa độ
def geocode(q):
    time.sleep(1.0)
    r = requests.get(f"{NOMINATIM}/search", params={"q": q, "format": "jsonv2", "limit": 1}, headers=UA)
    r.raise_for_status()
    j = r.json()
    if not j: raise ValueError("Không tìm thấy")
    return float(j[0]["lat"]), float(j[0]["lon"]), j[0].get("display_name", q)


# vẽ tuyến đồ lên bản đồ
def osrm_geom(lon1, lat1, lon2, lat2):
    r = requests.get(f"{OSRM}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}",
                     params={"overview":"full","geometries":"geojson"}, headers=UA, timeout=120)
    r.raise_for_status()
    data = r.json()
    route = data["routes"][0]
    return route["geometry"]


def create_map(recommendations):
    user_lat, user_lon, _ = geocode("Trường Đại học Khoa học Tự nhiên, Việt Nam")
    center_lat = recommendations["lat"].mean()
    center_lon = recommendations["lon"].mean()
    m = folium.Map(location=[center_lat, center_lon], zoom_start=12)
    folium.Marker([user_lat, user_lon], popup="User location", icon=folium.Icon(color='red')).add_to(m)

    for idx, row in recommendations.iterrows(): # duyện từng khách sạn trong recommendations để vẽ đường đi từ vị trí hiện tại đến hotel đó
        folium.Marker(
            [row["lat"], row["lon"]],
            popup=f"{row['hotelname']}<br>Địa chỉ: {row['address']}<br>Score: {row['score']:.4f}"
        ).add_to(m)
        geom = osrm_geom(user_lon, user_lat, row["lon"], row["lat"])
        latlon = [(lat, lon) for lon, lat in geom["coordinates"]]
        folium.PolyLine(latlon, color='blue', weight=2, opacity=0.7).add_to(m)

    m.save("hotels_map.html")
    print("Đã lưu: hotels_map.html")