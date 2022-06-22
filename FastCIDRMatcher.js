var FastCIDRMatcher = function (ipblocks) {
  this.ip4s = this.parseList(ipblocks || []);
};

const SubnetMaskTable = {
  CIDR: {
    "/1": parseInt("10000000000000000000000000000000", 2),
    "/2": parseInt("11000000000000000000000000000000", 2),
    "/3": parseInt("11100000000000000000000000000000", 2),
    "/4": parseInt("11110000000000000000000000000000", 2),
    "/5": parseInt("11111000000000000000000000000000", 2),
    "/6": parseInt("11111100000000000000000000000000", 2),
    "/7": parseInt("11111110000000000000000000000000", 2),
    "/8": parseInt("11111111000000000000000000000000", 2),
    "/9": parseInt("11111111100000000000000000000000", 2),
    "/10": parseInt("11111111110000000000000000000000", 2),
    "/11": parseInt("11111111111000000000000000000000", 2),
    "/12": parseInt("11111111111100000000000000000000", 2),
    "/13": parseInt("11111111111110000000000000000000", 2),
    "/14": parseInt("11111111111111000000000000000000", 2),
    "/15": parseInt("11111111111111100000000000000000", 2),
    "/16": parseInt("11111111111111110000000000000000", 2),
    "/17": parseInt("11111111111111111000000000000000", 2),
    "/18": parseInt("11111111111111111100000000000000", 2),
    "/19": parseInt("11111111111111111110000000000000", 2),
    "/20": parseInt("11111111111111111111000000000000", 2),
    "/21": parseInt("11111111111111111111100000000000", 2),
    "/22": parseInt("11111111111111111111110000000000", 2),
    "/23": parseInt("11111111111111111111111000000000", 2),
    "/24": parseInt("11111111111111111111111100000000", 2),
    "/25": parseInt("11111111111111111111111110000000", 2),
    "/26": parseInt("11111111111111111111111111000000", 2),
    "/27": parseInt("11111111111111111111111111100000", 2),
    "/28": parseInt("11111111111111111111111111110000", 2),
    "/29": parseInt("11111111111111111111111111111000", 2),
    "/30": parseInt("11111111111111111111111111111100", 2),
    "/31": parseInt("11111111111111111111111111111110", 2),
    "/32": parseInt("11111111111111111111111111111111", 2),
  },
};

const separateIPandSlash = (data) => {
  if (!data) return null; //FIXME: Do better error handling?

  const slashSplit = data.split("/");

  if (slashSplit.length > 2 || slashSplit.length < 1) return null;

  const slash = slashSplit.length == 2 ? parseInt(slashSplit[1]) : 32; //FIXME: do better error handling?

  if (!("/" + slash in SubnetMaskTable.CIDR)) return null;

  const IPSplit = slashSplit[0].split(".");

  if (IPSplit.length != 4) return null;

  IPSplit.forEach((octet, index) => {
    const value = parseInt(octet);

    if (value < 0 || value > 255) return null;
    IPSplit[index] = value;
  });

  return {
    Octets: IPSplit,
    Decimal:
      (IPSplit[0] << 24) + (IPSplit[1] << 16) + (IPSplit[2] << 8) + IPSplit[3],
    SubnetMask: SubnetMaskTable.CIDR["/" + slash],
    Slash: slash,
  };
};

FastCIDRMatcher.prototype.parseList = function (list) {
  const cleaned = list
    .reduce((acc, curr) => {
      const parsed = separateIPandSlash(curr);

      if (parsed == null) return acc;

      acc.push(parsed);

      return acc;
    }, [])
    .reduce((acc, curr) => {
      let temp = acc;
      const full =
        [...Array(32 - (curr.Decimal >>> 0).toString(2).length).keys()]
          .map((x) => "0")
          .join("") + (curr.Decimal >>> 0).toString(2);
      for (let i = 0; i < curr.Slash; i++) {
        const value = full.charAt(i);

        const isLast = i == curr.Slash - 1;

        if (!isLast) {
          if (!(value in temp)) {
            temp[value] = {};
          }
          temp = temp[value];
        } else {
          // if(value in temp)
          // {
          // console.log("WARN", temp, value, curr.Octets.join('.') + '/' + curr.Slash, path.join(''), full, (curr.Decimal>>>0))
          // // console.log(JSON.stringify(acc, 4));
          // process.exit(1);
          // }
          temp[value] = curr.Octets.join(".") + "/" + curr.Slash;
        }
      }
      return acc;
    }, {});

  return cleaned;
};

FastCIDRMatcher.prototype.containsIP = function (IP) {
  const parsedIP = separateIPandSlash(IP);
  if (!parsedIP) return false;

  const full =
    [...Array(32 - (parsedIP.Decimal >>> 0).toString(2).length).keys()]
      .map((x) => "0")
      .join("") + (parsedIP.Decimal >>> 0).toString(2);
  let temp = this.ip4s;

  for (let i = 0; i < 32; ) {
    const len = "L" in temp ? temp.L : 1;

    const opt = len == 1 ? full.charAt(i) : full.substr(i, len);
    if (opt in temp) temp = temp[opt];
    else return false;

    if (typeof temp !== "object") return true;
    i += len;
  }

  return false;
};

const getDepth = (object) => {
  const queue = [];

  queue.push({
    object,
    depth: 0,
  });

  while (queue.length != 0) {
    const current = queue.shift();
    if (typeof current.object !== "object") {
      return current.depth;
    }

    Object.values(current.object).forEach((value) => {
      queue.push({
        object: value,
        depth: current.depth + 1,
      });
    });
  }

  return -1; //Shouldn't be possible--at least when given actual data
};

FastCIDRMatcher.prototype.compressDatabase = function () {
  const DFS = (object, depth) => {
    if (depth < 0)
      return [
        {
          key: "",
          value: object,
        },
      ];

    return Object.keys(object).flatMap((key) => {
      return DFS(object[key], depth - 1).map((obj) => {
        return {
          key: key + obj.key,
          value: obj.value,
        };
      });
    });
  };

  const compressHelper = (original) => {
    const depth = getDepth(original);
    if (depth < 2) return original;

    return DFS(original, depth - 1).reduce(
      (acc, curr) => {
        acc[curr.key] = compressHelper(curr.value);
        return acc;
      },
      { L: depth }
    );
  };
  this.ip4s = compressHelper(this.ip4s);
};

module.exports = FastCIDRMatcher;
