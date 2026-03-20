import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


MOCK_MARKETS = [
    {
        "createBy": None,
        "createTime": None,
        "updateBy": None,
        "updateTime": None,
        "remark": None,
        "marketId": 1,
        "marketCode": None,
        "marketName": "上海西郊国际农产品交易中心",
        "marketContact": None,
        "marketMobile": None,
        "marketType": None,
        "marketDesc": None,
        "province": None,
        "city": None,
        "county": None,
        "town": None,
        "userId": None,
        "reportTypeNum": None,
        "marketAdress": None,
    },
    {
        "createBy": None,
        "createTime": None,
        "updateBy": None,
        "updateTime": None,
        "remark": None,
        "marketId": 2,
        "marketCode": None,
        "marketName": "上海农产品中心批发市场经营管理有限公司",
        "marketContact": None,
        "marketMobile": None,
        "marketType": None,
        "marketDesc": None,
        "province": None,
        "city": None,
        "county": None,
        "town": None,
        "userId": None,
        "reportTypeNum": None,
        "marketAdress": None,
    },
    {
        "createBy": None,
        "createTime": None,
        "updateBy": None,
        "updateTime": None,
        "remark": None,
        "marketId": 3,
        "marketCode": None,
        "marketName": "江苏无锡朝阳农产品大市场",
        "marketContact": None,
        "marketMobile": None,
        "marketType": None,
        "marketDesc": None,
        "province": None,
        "city": None,
        "county": None,
        "town": None,
        "userId": None,
        "reportTypeNum": None,
        "marketAdress": None,
    },
    {
        "createBy": None,
        "createTime": None,
        "updateBy": None,
        "updateTime": None,
        "remark": None,
        "marketId": 4,
        "marketCode": None,
        "marketName": "江苏苏州农产品大市场",
        "marketContact": None,
        "marketMobile": None,
        "marketType": None,
        "marketDesc": None,
        "province": None,
        "city": None,
        "county": None,
        "town": None,
        "userId": None,
        "reportTypeNum": None,
        "marketAdress": None,
    },
]


def build_mock_response(mode):
    if mode == "single":
        markets = MOCK_MARKETS[:1]
    else:
        markets = MOCK_MARKETS
    return {
        "msg": "操作成功",
        "code": 200,
        "data": markets,
    }


class MockHandler(BaseHTTPRequestHandler):
    endpoint = "/stage-api/tradeDynamicData/getTradeMarket"
    response_payload = build_mock_response("all")

    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == self.endpoint:
            self._send_json(self.response_payload)
            return

        self._send_json(
            {
                "msg": "mock endpoint not found",
                "code": 404,
                "path": path,
                "available": [self.endpoint],
            },
            status=404,
        )

    def log_message(self, format, *args):
        print("[mock-api]", format % args)


def main():
    parser = argparse.ArgumentParser(description="Mock trade market API server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host")
    parser.add_argument("--port", type=int, default=18080, help="Bind port")
    parser.add_argument("--mode", choices=["all", "single"], default="all", help="Mock market count mode")
    args = parser.parse_args()

    MockHandler.response_payload = build_mock_response(args.mode)
    server = ThreadingHTTPServer((args.host, args.port), MockHandler)
    print(f"Mock server running at http://{args.host}:{args.port}{MockHandler.endpoint}")
    print(f"Response mode: {args.mode} ({len(MockHandler.response_payload['data'])} market(s))")
    print("Use BASE_URL = 'http://127.0.0.1:18080/stage-api/' for local testing.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping mock server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
