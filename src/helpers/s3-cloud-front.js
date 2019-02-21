exports.s3ToCouldFront = (link, bucket, cloudFrontBase) => {
  const s3Host = `${bucket}.s3.amazonaws.com`;
  return link.replace(s3Host, cloudFrontBase);
};
