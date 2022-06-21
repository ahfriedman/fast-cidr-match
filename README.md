# Fast CIDR Matcher

This library determines if a given IPv4 is contained within a list if IP addresses and subnets in approximately O(log n) time—which is much faster than many existing libraries. 

## Installation 

```
npm i fast-cidr-match
```

## API 

### Create a FastCIDRMatcher

```js
const FastCIDRMatcher = require('fast-cidr-match');

//Constructor takes an array of CIDRs/IPv4s
const fastCidrMatcher = new FastCIDRMatcher(['192.168.0.0/16', '172.16.32,80', '10.0.0.0/8']); 
```

### ContainsIP

```js
fastCidrMatcher.containsIP('192.168.1.1') //True
fastCidrMatcher.containsIP('this is not an ip') //False
```


## Benchmark 


### 1,000,000 random IPs from a list of over 22,000 subnets

| Library          | Version | Execution time |
| ---------------- | ------- | -------------- |
| FastCIDRMatcher  | `1.0.0` | `2342 ms`      |
| cidr-matcher     | `2.1.1` | `57019 ms`     |



