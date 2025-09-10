// Simple hash partitioner with round-robin fallback
let rr = 0;
function hashCode(str){
let h = 0; for (let i=0;i<str.length;i++){ h = (h<<5) - h + str.charCodeAt(i); h|=0; }
return Math.abs(h);
}
function choosePartition({ key, partitions }){
if (key && String(key).length) return hashCode(String(key)) % partitions;
rr = (rr + 1) % partitions; return rr;
}
module.exports = { choosePartition };